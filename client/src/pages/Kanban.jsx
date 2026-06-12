import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Plus,
  AlertCircle,
  Clock,
  CheckSquare,
  ArrowRight,
  MoreVertical,
  Layers,
  Sparkles
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import TaskModal from '../components/TaskModal';

const COLUMNS = [
  { id: 'pending', title: 'Pending', color: 'bg-amber-500' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-blue-500' },
  { id: 'review', title: 'Review', color: 'bg-purple-500' },
  { id: 'completed', title: 'Completed', color: 'bg-emerald-500' }
];

const PRIORITY_COLORS = {
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  high: 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400',
  urgent: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
};

export default function Kanban() {
  const { activeWorkspace, activeProject } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [createWithStatus, setCreateWithStatus] = useState('pending');

  const fetchTasks = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      let url = `/tasks?workspaceId=${activeWorkspace._id}`;
      if (activeProject) {
        url += `&projectId=${activeProject._id}`;
      }
      const res = await api.get(url);
      setTasks(res.data.tasks);
    } catch (err) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [activeWorkspace, activeProject]);

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    // Check if task moved column or position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Find the task
    const taskIndex = tasks.findIndex(t => t._id === draggableId);
    if (taskIndex === -1) return;

    const taskToMove = { ...tasks[taskIndex] };
    const oldStatus = taskToMove.status;
    const newStatus = destination.droppableId;

    // Update Status Optimistically in Frontend
    taskToMove.status = newStatus;
    const updatedTasks = [...tasks];
    updatedTasks[taskIndex] = taskToMove;
    setTasks(updatedTasks);

    try {
      // API call to update status
      await api.put(`/tasks/${draggableId}/status`, { status: newStatus });
      
      // Also update position
      await api.put(`/tasks/${draggableId}/position`, {
        position: destination.index,
        status: newStatus
      });

      toast.success(`Task moved to ${newStatus}`, { duration: 1500 });
    } catch (err) {
      toast.error('Failed to sync drag status to database');
      // Rollback on fail
      taskToMove.status = oldStatus;
      const rollbackTasks = [...tasks];
      rollbackTasks[taskIndex] = taskToMove;
      setTasks(rollbackTasks);
    }
  };

  const handleCardClick = (task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleCreateCard = (statusId) => {
    setCreateWithStatus(statusId);
    setSelectedTask(null);
    setShowTaskModal(true);
  };

  const handleTaskSaved = () => {
    fetchTasks();
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col gap-6 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-[60vh] bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 flex flex-col h-full max-h-[calc(100vh-64px)] overflow-hidden">
      
      {/* Board Header */}
      <div className="flex justify-between items-center shrink-0 mb-6">
        <div>
          <h2 className="text-xl font-extrabold font-outfit text-slate-900 dark:text-white flex items-center gap-2">
            Kanban Board <Layers className="w-5 h-5 text-brand-500" />
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            {activeProject ? `Project: ${activeProject.name}` : 'All Workspace Tasks'}
          </p>
        </div>
        <button
          onClick={() => handleCreateCard('pending')}
          className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-lg transition flex items-center gap-1.5"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>New Task</span>
        </button>
      </div>

      {/* Drag Context container */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 flex gap-6 overflow-x-auto pb-4 items-start select-none">
          {COLUMNS.map(col => {
            const columnTasks = tasks.filter(t => t.status === col.id);
            return (
              <div
                key={col.id}
                className="w-72 shrink-0 bg-slate-100/60 dark:bg-slate-900/30 border border-slate-200/40 dark:border-slate-800/40 rounded-2xl p-4 flex flex-col max-h-[calc(100vh-210px)]"
              >
                {/* Column Title */}
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                    <span className="font-bold text-xs text-slate-800 dark:text-white font-outfit">{col.title}</span>
                    <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-500 font-semibold">
                      {columnTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCreateCard(col.id)}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Column Tasks Droppable */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 flex flex-col gap-3.5 overflow-y-auto px-0.5 pb-2 min-h-[150px] transition-colors rounded-xl ${snapshot.isDraggingOver ? 'bg-slate-200/20 dark:bg-slate-800/10' : ''}`}
                    >
                      {columnTasks.map((task, index) => (
                        <Draggable key={task._id} draggableId={task._id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => handleCardClick(task)}
                              className={`glass-card p-4 rounded-xl flex flex-col gap-3 cursor-grab active:cursor-grabbing hover:scale-[1.01] transition-all ${snapshot.isDragging ? 'shadow-2xl border-brand-500/30' : ''}`}
                            >
                              {/* Task Title */}
                              <h4 className="font-semibold text-xs text-slate-800 dark:text-white leading-tight">
                                {task.title}
                              </h4>

                              {/* Task Description snippet */}
                              {task.description && (
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                  {task.description}
                                </p>
                              )}

                              {/* Tags / Category */}
                              {task.category && (
                                <div className="flex gap-1">
                                  <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-semibold text-slate-500">
                                    {task.category}
                                  </span>
                                </div>
                              )}

                              {/* Card Footer */}
                              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/40 pt-2.5 mt-1">
                                {/* Due Date indicator */}
                                {task.dueDate ? (
                                  <div className="flex items-center gap-1 text-[9px] text-slate-500 font-semibold">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                                  </div>
                                ) : (
                                  <div />
                                )}

                                <div className="flex items-center gap-2.5">
                                  {/* Priority indicator */}
                                  <span className={`text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium}`}>
                                    {task.priority}
                                  </span>

                                  {/* Assignee Avatar */}
                                  {task.assignees && task.assignees.length > 0 ? (
                                    <div className="flex -space-x-1.5 overflow-hidden">
                                      {task.assignees.slice(0, 3).map((a, idx) => (
                                        <img
                                          key={idx}
                                          src={a.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${a.name || 'User'}`}
                                          className="inline-block h-5.5 w-5.5 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                                          alt=""
                                          title={a.name}
                                        />
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="w-5.5 h-5.5 rounded-full border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] text-slate-400">
                                      ?
                                    </div>
                                  )}
                                </div>
                              </div>

                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Task Creation & Editing Modal overlay */}
      {showTaskModal && (
        <TaskModal
          task={selectedTask}
          onClose={() => setShowTaskModal(false)}
          onSave={handleTaskSaved}
        />
      )}

    </div>
  );
}
