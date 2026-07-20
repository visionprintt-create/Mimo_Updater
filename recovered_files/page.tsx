import React from 'react';
import styles from './EmployeeDashboard.module.css';

export default function EmployeeDashboard() {
  return (
    <div className={styles.container}>
      <div className={styles.dashboard}>
        {/* Top Navbar */}
        <div className={styles.topNav}>
          <div className={styles.navLeft}>MIMO WorkTracker</div>
          <div className={styles.navCenter}>
            <span>Dashboard</span>
            <div className={styles.iconBtn}>🔔</div>
            <div className={styles.iconBtn}>🔍 Search</div>
            <div className={styles.iconBtn}>👤 Admin</div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className={styles.mainBody}>
          {/* Sidebar */}
          <div className={styles.sidebar}>
            <ul>
              <li className={styles.active}>Dashboard</li>
              <li>Employees</li>
              <li>Departments</li>
              <li>Attendance</li>
              <li>Tasks</li>
              <li>Reports</li>
              <li>Analytics</li>
              <li>Settings</li>
              <li>Logout</li>
            </ul>
          </div>

          {/* Content */}
          <div className={styles.content}>
            {/* Header */}
            <div className={styles.sectionHeader}>
              <div className={styles.welcomeText}>Welcome Back</div>
              <div className={styles.timeText}>09:20</div>
            </div>

            {/* Stats Row */}
            <div className={styles.statsRow}>
              <div className={styles.statBox}>
                <div className={styles.statLabel}>Hours</div>
                <div className={styles.statValue}>142h</div>
              </div>
              <div className={styles.statBox}>
                <div className={styles.statLabel}>Active</div>
                <div className={styles.statValue}>18</div>
              </div>
              <div className={styles.statBox}>
                <div className={styles.statLabel}>Tasks</div>
                <div className={styles.statValue}>93</div>
              </div>
              <div className={styles.statBox}>
                <div className={styles.statLabel}>Productivity</div>
                <div className={styles.statValue}>96%</div>
              </div>
            </div>

            {/* Middle Section */}
            <div className={styles.middleSection}>
              <div className={styles.card}>
                <div className={styles.cardTitle}>Current Session</div>
                <div className={styles.placeholderContent}>Session details</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardTitle}>Timeline</div>
                <div className={styles.placeholderContent}>Timeline view</div>
              </div>
            </div>

            {/* Chart Section */}
            <div className={`${styles.card} ${styles.chartSection}`}>
              <div className={styles.cardTitle}>Weekly Hours Chart</div>
              <div className={styles.placeholderContent}>[ Chart Visualization ]</div>
            </div>

            {/* Footer Section */}
            <div className={styles.footerSection}>
              <div className={styles.card}>
                <div className={styles.cardTitle}>Recent Activity</div>
                <div className={styles.placeholderContent}>No recent activity</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardTitle}>Team Status</div>
                <div className={styles.placeholderContent}>All teams active</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardTitle}>Notifications</div>
                <div className={styles.placeholderContent}>0 new notifications</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
