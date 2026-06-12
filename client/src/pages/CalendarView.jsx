import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../services/api';
import toast from 'react-hot-toast';
import TaskModal from '../components/TaskModal';
import { CalendarDays, Plus } from 'lucide-react';

const localizer = momentLocalizer(moment);

export default function CalendarView() {
  const { activeWorkspace, activeProject } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());

  const fetchTasks = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      let url = `/tasks?workspaceId=${activeWorkspace._id}`;
      if (activeProject) url += `&projectId=${activeProject._id}`;
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

  // Map tasks with due dates to calendar events
  const calendarEvents = tasks
    .filter(t => t.dueDate)
    .map(task => ({
      id: task._id,
      title: task.title,
      start: new Date(task.dueDate),
      end: new Date(task.dueDate),
      resource: task,
    }));

  const handleSelectEvent = (event) => {
    setSelectedTask(event.resource);
    setShowTaskModal(true);
  };

  const handleSelectSlot = (slotInfo) => {
    setSelectedTask(null);
    setShowTaskModal(true);
  };

  const eventStyleGetter = (event) => {
    const task = event.resource;
    const priorityColors = {
      urgent: '#ef4444',
      high: '#f97316',
      medium: '#7c3aed',
      low: '#10b981',
    };
    return {
      style: {
        backgroundColor: priorityColors[task.priority] || '#7c3aed',
        borderRadius: '8px',
        opacity: task.status === 'completed' ? 0.5 : 1,
        color: '#fff',
        border: 'none',
        padding: '2px 6px',
        fontSize: '11px',
        fontWeight: 600,
      },
    };
  };

  if (loading) {
    return (
      <div className="p-8 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-48 mb-6" />
        <div className="h-[70vh] bg-slate-200 dark:bg-slate-800 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="p-8 flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h2 className="text-xl font-extrabold font-outfit text-slate-900 dark:text-white flex items-center gap-2">
            Calendar View <CalendarDays className="w-5 h-5 text-brand-500" />
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            {calendarEvents.length} tasks with due dates shown
          </p>
        </div>
        <button
          onClick={() => { setSelectedTask(null); setShowTaskModal(true); }}
          className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-lg transition flex items-center gap-1.5"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>New Task</span>
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 shrink-0 flex-wrap">
        {[
          { label: 'Urgent', color: '#ef4444' },
          { label: 'High', color: '#f97316' },
          { label: 'Medium', color: '#7c3aed' },
          { label: 'Low', color: '#10b981' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
            <span>{item.label} Priority</span>
          </div>
        ))}
      </div>

      {/* Calendar Component */}
      <div className="flex-1 min-h-[550px]">
        <Calendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          eventPropGetter={eventStyleGetter}
          views={['month', 'week', 'day', 'agenda']}
          popup
          style={{ height: '100%' }}
        />
      </div>

      {showTaskModal && (
        <TaskModal
          task={selectedTask}
          onClose={() => setShowTaskModal(false)}
          onSave={() => {
            fetchTasks();
            setShowTaskModal(false);
          }}
        />
      )}
    </div>
  );
}
