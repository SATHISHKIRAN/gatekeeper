import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar as CalendarIcon, X } from 'lucide-react';
import toast from 'react-hot-toast';

const Calendar = () => {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // New Event Form
    const [newEvent, setNewEvent] = useState({
        title: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        type: 'holiday'
    });

    const canEdit = ['hod', 'warden', 'principal', 'admin'].includes(user?.role);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const res = await axios.get('/api/calendar');
            setEvents(res.data);
            setLoading(false);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load calendar events');
            setLoading(false);
        }
    };

    const handleAddEvent = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/calendar', newEvent);
            toast.success('Event added successfully');
            setIsModalOpen(false);
            fetchEvents();
            setNewEvent({
                title: '',
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date().toISOString().split('T')[0],
                type: 'holiday'
            });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add event');
        }
    };

    const handleDeleteEvent = async (id) => {
        if (!window.confirm('Are you sure you want to delete this event?')) return;
        try {
            await axios.delete(`/api/calendar/${id}`);
            toast.success('Event deleted');
            fetchEvents();
        } catch (error) {
            toast.error('Failed to delete event');
        }
    };

    // Calendar Generation Logic
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const getDayEvents = (day) => {
        return events.filter(e => {
            const start = new Date(e.start_date);
            const end = new Date(e.end_date);
            // Normalize to YYYY-MM-DD for comparison to avoid time issues
            const dStr = format(day, 'yyyy-MM-dd');
            const sStr = format(start, 'yyyy-MM-dd');
            const eStr = format(end, 'yyyy-MM-dd');
            return dStr >= sStr && dStr <= eStr;
        });
    };

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const EventTypeColors = {
        holiday: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800',
        exam: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
        event: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <CalendarIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        Academic Calendar
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400">View holidays, exams, and important dates</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-1">
                        <button onClick={prevMonth} className="p-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-slate-400" />
                        </button>
                        <span className="w-32 text-center font-bold text-gray-800 dark:text-white">
                            {format(currentDate, 'MMMM yyyy')}
                        </span>
                        <button onClick={nextMonth} className="p-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-slate-400" />
                        </button>
                    </div>

                    {canEdit && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Add Event
                        </button>
                    )}
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="grid grid-cols-7 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 auto-rows-fr bg-gray-100/50 dark:bg-slate-800 gap-[1px]">
                    {calendarDays.map((day, idx) => {
                        const dayEvents = getDayEvents(day);
                        const isCurrentMonth = isSameMonth(day, currentDate);

                        return (
                            <div
                                key={day.toString()}
                                className={`
                                    min-h-[120px] p-2 bg-white dark:bg-slate-900 transition-colors
                                    ${!isCurrentMonth ? 'bg-gray-50/30 dark:bg-slate-900/50 text-gray-300 dark:text-slate-700' : ''}
                                    ${isToday(day) ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}
                                `}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`
                                        text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
                                        ${isToday(day) ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-slate-400'}
                                    `}>
                                        {format(day, 'd')}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    {dayEvents.map(event => (
                                        <div
                                            key={event.id}
                                            className={`
                                                relative group text-[10px] px-2 py-1 rounded border font-medium truncate
                                                ${EventTypeColors[event.type] || EventTypeColors.event}
                                            `}
                                            title={event.title}
                                        >
                                            {event.title}
                                            {canEdit && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteEvent(event.id);
                                                    }}
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:text-red-600 bg-inherit rounded p-0.5 transition-opacity"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Add Event Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 w-full max-w-md relative z-10"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Calendar Event</h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleAddEvent} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Title</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full rounded-xl border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                                        value={newEvent.title}
                                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            required
                                            className="w-full rounded-xl border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 p-3 text-sm"
                                            value={newEvent.start_date}
                                            onChange={(e) => setNewEvent({ ...newEvent, start_date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">End Date</label>
                                        <input
                                            type="date"
                                            required
                                            className="w-full rounded-xl border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 p-3 text-sm"
                                            value={newEvent.end_date}
                                            min={newEvent.start_date}
                                            onChange={(e) => setNewEvent({ ...newEvent, end_date: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Type</label>
                                    <select
                                        className="w-full rounded-xl border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 p-3 text-sm"
                                        value={newEvent.type}
                                        onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                                    >
                                        <option value="holiday">Holiday</option>
                                        <option value="exam">Exam</option>
                                        <option value="event">Event</option>
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold mt-2 shadow-lg shadow-indigo-500/20 transition-all"
                                >
                                    Create Event
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Calendar;
