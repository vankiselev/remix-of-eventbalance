import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WarehouseItem {
  id: string;
  name: string;
  sku: string;
  min_stock: number;
  total_quantity: number;
}

interface OverdueTask {
  id: string;
  event_id: string | null;
  assigned_to: string;
  task_type: 'collection' | 'return';
  due_date: string;
  event_name?: string;
  assigned_to_name?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting warehouse notifications check...');

    // 1. Check for low stock items
    const lowStockNotifications = await checkLowStock(supabase);

    // 2. Check for overdue return tasks
    const overdueNotifications = await checkOverdueReturns(supabase);

    // 3. Send reminders for upcoming returns (tomorrow)
    const reminderNotifications = await sendReturnReminders(supabase);

    const totalSent = lowStockNotifications + overdueNotifications + reminderNotifications;

    console.log(`Notifications check complete. Sent ${totalSent} notifications:`, {
      lowStock: lowStockNotifications,
      overdue: overdueNotifications,
      reminders: reminderNotifications,
    });

    return new Response(
      JSON.stringify({
        success: true,
        notifications_sent: totalSent,
        details: {
          low_stock: lowStockNotifications,
          overdue: overdueNotifications,
          reminders: reminderNotifications,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in warehouse-notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function checkLowStock(supabase: any): Promise<number> {
  console.log('Checking for low stock items...');

  // Get items with stock below minimum
  const { data: items, error: itemsError } = await supabase
    .from('warehouse_items')
    .select('id, sku, name, min_stock')
    .eq('is_active', true);

  if (itemsError) {
    console.error('Error fetching items:', itemsError);
    return 0;
  }

  // Get stock for all items
  const { data: stockData, error: stockError } = await supabase
    .from('warehouse_stock')
    .select('item_id, quantity');

  if (stockError) {
    console.error('Error fetching stock:', stockError);
    return 0;
  }

  // Calculate total quantity per item
  const stockMap = new Map<string, number>();
  (stockData || []).forEach((stock: any) => {
    const current = stockMap.get(stock.item_id) || 0;
    stockMap.set(stock.item_id, current + (stock.quantity || 0));
  });

  // Find items below minimum stock
  const lowStockItems: WarehouseItem[] = [];
  (items || []).forEach((item: any) => {
    const totalQty = stockMap.get(item.id) || 0;
    if (totalQty < item.min_stock) {
      lowStockItems.push({
        id: item.id,
        name: item.name,
        sku: item.sku,
        min_stock: item.min_stock,
        total_quantity: totalQty,
      });
    }
  });

  if (lowStockItems.length === 0) {
    console.log('No low stock items found');
    return 0;
  }

  console.log(`Found ${lowStockItems.length} low stock items`);

  // Get admins to notify (users with warehouse permissions or admins)
  const { data: admins, error: adminsError } = await supabase
    .from('profiles')
    .select('id')
    .eq('employment_status', 'active')
    .eq('role', 'admin');

  if (adminsError || !admins || admins.length === 0) {
    console.log('No admins found to notify');
    return 0;
  }

  // Create notifications for each admin
  let notificationsSent = 0;
  for (const admin of admins) {
    for (const item of lowStockItems) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: admin.id,
          title: '⚠️ Низкий остаток на складе',
          message: `Товар "${item.name}" (${item.sku}): ${item.total_quantity} из ${item.min_stock} минимум`,
          type: 'warehouse_low_stock',
          data: {
            item_id: item.id,
            item_name: item.name,
            sku: item.sku,
            current_quantity: item.total_quantity,
            min_stock: item.min_stock,
          },
        });

      if (!notifError) {
        notificationsSent++;
      } else {
        console.error('Error creating notification:', notifError);
      }
    }
  }

  console.log(`Sent ${notificationsSent} low stock notifications`);
  return notificationsSent;
}

async function checkOverdueReturns(supabase: any): Promise<number> {
  console.log('Checking for overdue return tasks...');

  const today = new Date().toISOString().split('T')[0];

  // Get overdue return tasks
  const { data: tasks, error: tasksError } = await supabase
    .from('warehouse_tasks')
    .select(`
      id,
      event_id,
      assigned_to,
      task_type,
      due_date,
      events!warehouse_tasks_event_id_fkey(name),
      assigned_to_profile:profiles!warehouse_tasks_assigned_to_fkey(full_name)
    `)
    .eq('task_type', 'return')
    .in('status', ['pending', 'in_progress'])
    .lt('due_date', today);

  if (tasksError) {
    console.error('Error fetching overdue tasks:', tasksError);
    return 0;
  }

  if (!tasks || tasks.length === 0) {
    console.log('No overdue return tasks found');
    return 0;
  }

  console.log(`Found ${tasks.length} overdue return tasks`);

  // Send notifications
  let notificationsSent = 0;
  for (const task of tasks) {
    const eventName = (task as any).events?.name || 'Неизвестное мероприятие';
    const assignedToName = (task as any).assigned_to_profile?.full_name || 'Исполнитель';

    // Notify assigned person
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: task.assigned_to,
        title: '🔴 Просрочен возврат реквизита',
        message: `Задача возврата для "${eventName}" просрочена (срок: ${task.due_date})`,
        type: 'warehouse_return_overdue',
        data: {
          task_id: task.id,
          event_id: task.event_id,
          event_name: eventName,
          due_date: task.due_date,
        },
      });

    if (!notifError) {
      notificationsSent++;
    } else {
      console.error('Error creating notification:', notifError);
    }
  }

  console.log(`Sent ${notificationsSent} overdue notifications`);
  return notificationsSent;
}

async function sendReturnReminders(supabase: any): Promise<number> {
  console.log('Sending return reminders for tomorrow...');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Get return tasks due tomorrow
  const { data: tasks, error: tasksError } = await supabase
    .from('warehouse_tasks')
    .select(`
      id,
      event_id,
      assigned_to,
      task_type,
      due_date,
      events!warehouse_tasks_event_id_fkey(name),
      assigned_to_profile:profiles!warehouse_tasks_assigned_to_fkey(full_name)
    `)
    .eq('task_type', 'return')
    .in('status', ['pending', 'in_progress'])
    .eq('due_date', tomorrowStr);

  if (tasksError) {
    console.error('Error fetching tomorrow tasks:', tasksError);
    return 0;
  }

  if (!tasks || tasks.length === 0) {
    console.log('No return tasks due tomorrow');
    return 0;
  }

  console.log(`Found ${tasks.length} return tasks due tomorrow`);

  // Send reminders
  let notificationsSent = 0;
  for (const task of tasks) {
    const eventName = (task as any).events?.name || 'Неизвестное мероприятие';

    // Notify assigned person
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: task.assigned_to,
        title: '🔔 Напоминание о возврате реквизита',
        message: `Завтра нужно вернуть реквизит для "${eventName}"`,
        type: 'warehouse_return_reminder',
        data: {
          task_id: task.id,
          event_id: task.event_id,
          event_name: eventName,
          due_date: task.due_date,
        },
      });

    if (!notifError) {
      notificationsSent++;
    } else {
      console.error('Error creating notification:', notifError);
    }
  }

  console.log(`Sent ${notificationsSent} reminder notifications`);
  return notificationsSent;
}
