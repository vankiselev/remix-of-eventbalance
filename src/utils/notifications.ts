// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

interface SendNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: 'report' | 'salary' | 'event' | 'vacation' | 'transaction' | 'system' | 'task';
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
  type: 'report' | 'salary' | 'event' | 'vacation' | 'transaction' | 'system' | 'task',
  data?: any
) => {
  try {
    // Get admin users via role_assignments + role_definitions
    const { data: adminAssignments, error } = await supabase
      .from('user_role_assignments')
      .select('user_id, role_definitions!inner(name)')
      .or('name.eq.admin,name.eq.super_admin', { referencedTable: 'role_definitions' });

    if (error) throw error;

    // Extract unique admin user IDs
    const adminUserIds = [...new Set((adminAssignments || []).map(a => a.user_id))];

    // Send notification to each admin
    const notificationPromises = adminUserIds.map(userId =>
      sendNotification({
        userId,
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
