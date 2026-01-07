/**
 * Admin Layout
 *
 * Provides navigation and layout for admin pages.
 */

import Link from 'next/link';
import { ReactNode } from 'react';
import { AdminLogoutButton } from '@/components/AdminLogoutButton';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="admin-layout">
      {/* Admin Header */}
      <header className="admin-header">
        <div className="admin-header-content">
          <Link href="/admin" className="admin-logo">
            Admin Dashboard
          </Link>
          <nav className="admin-nav">
            <Link href="/admin" className="admin-nav-link">
              Overview
            </Link>
            <Link href="/admin/forms" className="admin-nav-link">
              Forms
            </Link>
            <Link href="/admin/submissions" className="admin-nav-link">
              Submissions
            </Link>
            <Link href="/admin/workflows" className="admin-nav-link">
              Workflows
            </Link>
          </nav>
          <div className="admin-actions">
            <Link href="/" className="admin-nav-link">
              View Site
            </Link>
            <AdminLogoutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="admin-main">{children}</main>

      <style jsx global>{`
        .admin-layout {
          min-height: 100vh;
          background: #f5f5f5;
        }

        .admin-header {
          background: #1a1a2e;
          color: white;
          padding: 0 1.5rem;
          height: 60px;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .admin-header-content {
          max-width: 1400px;
          margin: 0 auto;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .admin-logo {
          font-weight: 600;
          font-size: 1.125rem;
          color: white;
          text-decoration: none;
        }

        .admin-nav {
          display: flex;
          gap: 0.5rem;
        }

        .admin-nav-link {
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .admin-nav-link:hover {
          color: white;
          background: rgba(255, 255, 255, 0.1);
        }

        .admin-main {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem 1.5rem;
        }

        .admin-card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
        }

        .admin-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .admin-card-title {
          font-size: 1rem;
          font-weight: 600;
          color: #333;
          margin: 0;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
        }

        .admin-table th,
        .admin-table td {
          padding: 0.75rem 1rem;
          text-align: left;
          border-bottom: 1px solid #eee;
        }

        .admin-table th {
          font-weight: 500;
          color: #666;
          font-size: 0.75rem;
          text-transform: uppercase;
        }

        .admin-table tbody tr:hover {
          background: #f9f9f9;
        }

        .admin-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .admin-badge-success {
          background: #d4edda;
          color: #155724;
        }

        .admin-badge-warning {
          background: #fff3cd;
          color: #856404;
        }

        .admin-badge-error {
          background: #f8d7da;
          color: #721c24;
        }

        .admin-badge-info {
          background: #d1ecf1;
          color: #0c5460;
        }

        .admin-stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .admin-stat-card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 1.25rem;
        }

        .admin-stat-label {
          font-size: 0.75rem;
          color: #666;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
        }

        .admin-stat-value {
          font-size: 2rem;
          font-weight: 600;
          color: #333;
        }

        .admin-empty {
          text-align: center;
          padding: 3rem;
          color: #666;
        }

        .admin-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }

        .admin-btn-primary {
          background: #1a1a2e;
          color: white;
        }

        .admin-btn-primary:hover {
          background: #2a2a4e;
        }

        .admin-btn-secondary {
          background: #e5e5e5;
          color: #333;
        }

        .admin-btn-secondary:hover {
          background: #d5d5d5;
        }

        .admin-page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
        }

        .admin-page-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #333;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
