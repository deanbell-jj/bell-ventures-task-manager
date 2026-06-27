/**
 * Task Management Routes - Supabase Version
 * Full CRUD operations for tasks stored in Supabase
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const { supabase, db } = require('../config/supabase');

const router = express.Router();

/**
 * Middleware: Verify JWT token
 */
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// All routes require authentication
router.use(verifyToken);

/**
 * GET /api/tasks
 * Get user's tasks with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const { status, priority } = req.query;
    const userId = req.user.userId;

    // Get all tasks where user is assigned or creator
    const { data: assignedTaskIds } = await supabase
      .from('task_assignees')
      .select('task_id')
      .eq('assigned_to', userId);

    const taskIds = assignedTaskIds?.map(a => a.task_id) || [];

    let query = supabase
      .from('tasks')
      .select('*');

    // Filter: tasks created by user OR assigned to user
    query = query.or(`created_by.eq.${userId},id.in.(${taskIds.join(',')})`);

    // Optional filters
    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);

    query = query.order('due_date', { ascending: true });

    const { data: tasks, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      count: tasks?.length || 0,
      tasks: tasks || []
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: error.message
    });
  }
});

/**
 * GET /api/tasks/:id
 * Get a specific task
 */
router.get('/:id', async (req, res) => {
  try {
    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task',
      error: error.message
    });
  }
});

/**
 * POST /api/tasks
 * Create a new task
 */
router.post('/', async (req, res) => {
  try {
    const { title, description, priority = 'medium', due_date } = req.body;
    const userId = req.user.userId;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Task title is required'
      });
    }

    const newTask = {
      title,
      description: description || null,
      priority,
      status: 'not_started',
      created_by: userId,
      due_date: due_date || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const task = await db.insert('tasks', newTask);

    // Auto-assign to creator
    await db.insert('task_assignees', {
      task_id: task.id,
      assigned_to: userId,
      assigned_by: userId,
      assigned_date: new Date().toISOString()
    });

    // Log activity
    await db.insert('activity_log', {
      user_id: userId,
      action_type: 'created',
      entity_type: 'task',
      entity_id: task.id,
      changes: { title },
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create task',
      error: error.message
    });
  }
});

/**
 * PUT /api/tasks/:id
 * Update a task
 */
router.put('/:id', async (req, res) => {
  try {
    const { title, description, status, priority, due_date } = req.body;
    const userId = req.user.userId;
    const taskId = req.params.id;

    const updates = {
      updated_at: new Date().toISOString()
    };

    if (title) updates.title = title;
    if (description) updates.description = description;
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (due_date) updates.due_date = due_date;

    const task = await db.update('tasks', taskId, updates);

    // Log activity
    await db.insert('activity_log', {
      user_id: userId,
      action_type: 'updated',
      entity_type: 'task',
      entity_id: taskId,
      changes: updates,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task',
      error: error.message
    });
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete a task
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.userId;
    const taskId = req.params.id;

    // Log deletion before deleting
    await db.insert('activity_log', {
      user_id: userId,
      action_type: 'deleted',
      entity_type: 'task',
      entity_id: taskId,
      changes: {},
      timestamp: new Date().toISOString()
    });

    await db.delete('tasks', taskId);

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task',
      error: error.message
    });
  }
});

/**
 * GET /api/tasks/stats/summary
 * Get task statistics
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const userId = req.user.userId;

    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('created_by', userId);

    if (!tasks) {
      return res.json({
        success: true,
        stats: {
          total_tasks: 0,
          pending: 0,
          in_progress: 0,
          completed: 0,
          critical_tasks: 0,
          overdue: 0
        }
      });
    }

    const stats = {
      total_tasks: tasks.length,
      pending: tasks.filter(t => t.status === 'not_started').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      critical_tasks: tasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length,
      overdue: tasks.filter(t => {
        const due = new Date(t.due_date);
        return due < new Date() && t.status !== 'completed';
      }).length
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

module.exports = router;
