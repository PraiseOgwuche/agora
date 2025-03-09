// src/components/NotificationsComponent.js
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Notifications.css';

function NotificationsComponent() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef(null);
  
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (error) throw error;
        
        setNotifications(data || []);
        setUnreadCount(data.filter(n => !n.read).length);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNotifications();
    
    // Set up real-time subscription for new notifications
    const subscription = supabase
      .channel(`user_notifications_${user?.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${user?.id}`
      }, payload => {
        setNotifications(prev => [payload.new, ...prev]);
        setUnreadCount(prevCount => prevCount + 1);
      })
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [user]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
      
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
      
      setUnreadCount(prevCount => Math.max(0, prevCount - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
      
      if (error) throw error;
      
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };
  
  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };
  
  const getRelatedLink = (type, relatedId) => {
    switch (type) {
      case 'paper_status':
      case 'review_assigned':
      case 'like':
      case 'comment':
      case 'feedback':
        return `/papers/${relatedId}`;
      default:
        return null;
    }
  };
  
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return '👍 ';
      case 'comment':
        return '💬 ';
      case 'feedback':
        return '📝 ';
      case 'paper_status':
        return '📄 ';
      case 'review_assigned':
        return '✅ ';
      default:
        return '🔔 ';
    }
  };
  
  if (!user) return null;
  
  return (
    <div className="notifications-container" ref={notificationsRef}>
      <button 
        className="notifications-button" 
        onClick={toggleNotifications}
      >
        <span className="notification-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>
      
      {showNotifications && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button 
                className="mark-all-read" 
                onClick={markAllAsRead}
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="notifications-list">
            {loading ? (
              <div className="notification-loading">Loading...</div>
            ) : notifications.length > 0 ? (
              notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  data-type={notification.type}
                  onClick={() => markAsRead(notification.id)}
                >
                  {getRelatedLink(notification.type, notification.related_id) ? (
                    <Link to={getRelatedLink(notification.type, notification.related_id)}>
                      <div className="notification-content">
                        {getNotificationIcon(notification.type)}
                        {notification.message}
                      </div>
                      <div className="notification-time">
                        {new Date(notification.created_at).toLocaleString()}
                      </div>
                    </Link>
                  ) : (
                    <>
                      <div className="notification-content">
                        {getNotificationIcon(notification.type)}
                        {notification.message}
                      </div>
                      <div className="notification-time">
                        {new Date(notification.created_at).toLocaleString()}
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <div className="no-notifications">No notifications</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationsComponent;