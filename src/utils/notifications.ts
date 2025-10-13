import { supabase } from "@/integrations/supabase/client";

interface SendNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: 'report' | 'salary' | 'event' | 'vacation' | 'transaction' | 'system';
  data?: any;
}

export const sendNotification = async ({
  userId,
  title,
  message,
  type,
  data,
}: SendNotificationParams) => {
  try {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_id: userId,
        title,
        message,
        type,
        data,
      },
    });

    if (error) {
      console.error('Error sending notification:', error);
    }
  } catch (error) {
    console.error('Error invoking notification function:', error);
  }
};

export const sendNotificationToAdmins = async (
  title: string,
  message: string,
  type: 'report' | 'salary' | 'event' | 'vacation' | 'transaction' | 'system',
  data?: any
) => {
  try {
    // Get all admin users
    const { data: admins, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin');

    if (error) throw error;

    // Send notification to each admin
    const notificationPromises = (admins || []).map(admin =>
      sendNotification({
        userId: admin.id,
        title,
        message,
        type,
        data,
      })
    );

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error('Error sending notifications to admins:', error);
  }
};
