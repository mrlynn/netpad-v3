/**
 * Template Gallery MCP App
 *
 * Displays templates in a visual card-based gallery.
 */

import React, { useState, useEffect, useMemo } from 'react';
import type { TemplateGalleryData, TemplateItem } from '../../types';

interface AppProps {
  initialData?: TemplateGalleryData;
}

export function App({ initialData }: AppProps) {
  const [data, setData] = useState<TemplateGalleryData | null>(initialData ?? null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const message = event.data;
        if (message?.type === 'MCP_TOOL_RESULT' && message.data) {
          setData(message.data as TemplateGalleryData);
          setError(null);
        }
      } catch (err) {
        setError('Failed to parse template data');
        console.error('Error parsing MCP message:', err);
      }
    };

    window.addEventListener('message', handleMessage);
    window.parent?.postMessage({ type: 'READY' }, '*');

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const theme = useMemo(() => {
    if (data?.theme) return data.theme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, [data?.theme]);

  const categories = useMemo(() => {
    if (!data?.templates) return [];
    const cats = [...new Set(data.templates.map((t) => t.category))];
    return cats.sort();
  }, [data?.templates]);

  const filteredTemplates = useMemo(() => {
    if (!data?.templates) return [];
    if (!selectedCategory) return data.templates;
    return data.templates.filter((t) => t.category === selectedCategory);
  }, [data?.templates, selectedCategory]);

  const handleTemplateClick = (template: TemplateItem) => {
    window.parent?.postMessage(
      {
        type: 'TEMPLATE_SELECTED',
        payload: {
          templateId: template.id,
          templateName: template.name,
          templateType: data?.templateType,
        },
      },
      '*'
    );
  };

  const handleImportClick = (e: React.MouseEvent, template: TemplateItem) => {
    e.stopPropagation();
    window.parent?.postMessage(
      {
        type: 'REQUEST_IMPORT',
        payload: { templateId: template.id },
      },
      '*'
    );
  };

  if (error) {
    return (
      <div style={containerStyle(theme)}>
        <div style={errorStyle}>⚠️ {error}</div>
      </div>
    );
  }

  if (!data?.templates) {
    return (
      <div style={containerStyle(theme)}>
        <div style={loadingStyle}>Loading templates...</div>
      </div>
    );
  }

  return (
    <div style={containerStyle(theme)}>
      {/* Header */}
      <div style={headerStyle(theme)}>
        <h2 style={titleStyle(theme)}>
          {getTemplateTypeLabel(data.templateType)} Templates
        </h2>
        <span style={countStyle(theme)}>{data.templates.length} templates</span>
      </div>

      {/* Category Filter */}
      {data.showCategories !== false && categories.length > 1 && (
        <div style={categoriesStyle}>
          <button
            style={categoryButtonStyle(theme, !selectedCategory)}
            onClick={() => setSelectedCategory(null)}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              style={categoryButtonStyle(theme, selectedCategory === cat)}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Template Grid */}
      <div style={gridStyle}>
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            style={cardStyle(theme)}
            onClick={() => handleTemplateClick(template)}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor =
                theme === 'dark' ? '#00ED64' : '#00684A';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor =
                theme === 'dark' ? 'rgba(110, 118, 129, 0.2)' : 'rgba(0, 104, 74, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {/* Icon */}
            <div style={iconContainerStyle(theme)}>
              <span style={iconStyle}>{template.icon || getDefaultIcon(data.templateType)}</span>
            </div>

            {/* Content */}
            <div style={cardContentStyle}>
              <h3 style={cardTitleStyle(theme)}>{template.name}</h3>
              <p style={cardDescStyle(theme)}>{template.description}</p>

              {/* Tags */}
              {template.tags && template.tags.length > 0 && (
                <div style={tagsStyle}>
                  {template.tags.slice(0, 3).map((tag) => (
                    <span key={tag} style={tagStyle(theme)}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Category Badge */}
            <div style={categoryBadgeStyle(theme)}>{template.category}</div>

            {/* Import Button */}
            <button
              style={importButtonStyle(theme)}
              onClick={(e) => handleImportClick(e, template)}
            >
              Import
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function getTemplateTypeLabel(type?: string): string {
  switch (type) {
    case 'form': return 'Form';
    case 'workflow': return 'Workflow';
    case 'application': return 'Application';
    case 'conversational': return 'Conversational';
    case 'query': return 'Query';
    default: return 'All';
  }
}

function getDefaultIcon(type?: string): string {
  switch (type) {
    case 'form': return '📝';
    case 'workflow': return '⚡';
    case 'application': return '📦';
    case 'conversational': return '💬';
    case 'query': return '🔍';
    default: return '📄';
  }
}

// Styles
const containerStyle = (theme: 'light' | 'dark'): React.CSSProperties => ({
  width: '100%',
  height: '100%',
  backgroundColor: theme === 'dark' ? '#0a0e14' : '#F8FAF9',
  color: theme === 'dark' ? '#e6edf3' : '#1a1a2e',
  overflow: 'auto',
  padding: '16px',
  fontFamily: "'Inter', -apple-system, 'Segoe UI', 'Roboto', sans-serif",
});

const headerStyle = (theme: 'light' | 'dark'): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '16px',
  paddingBottom: '12px',
  borderBottom: `1px solid ${theme === 'dark' ? 'rgba(110, 118, 129, 0.2)' : 'rgba(0, 104, 74, 0.1)'}`,
});

const titleStyle = (theme: 'light' | 'dark'): React.CSSProperties => ({
  margin: 0,
  fontSize: '18px',
  fontWeight: 600,
  color: theme === 'dark' ? '#e6edf3' : '#1a1a2e',
});

const countStyle = (theme: 'light' | 'dark'): React.CSSProperties => ({
  fontSize: '13px',
  color: theme === 'dark' ? '#8b949e' : '#5c6370',
});

const categoriesStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  marginBottom: '16px',
};

const categoryButtonStyle = (theme: 'light' | 'dark', isActive: boolean): React.CSSProperties => ({
  padding: '6px 12px',
  fontSize: '12px',
  fontWeight: 500,
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  backgroundColor: isActive
    ? theme === 'dark' ? '#00ED64' : '#00684A'
    : theme === 'dark' ? 'rgba(110, 118, 129, 0.1)' : 'rgba(0, 104, 74, 0.05)',
  color: isActive
    ? theme === 'dark' ? '#000' : '#fff'
    : theme === 'dark' ? '#e6edf3' : '#1a1a2e',
  transition: 'all 0.15s ease',
});

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '16px',
};

const cardStyle = (theme: 'light' | 'dark'): React.CSSProperties => ({
  position: 'relative',
  padding: '16px',
  borderRadius: '12px',
  border: `1px solid ${theme === 'dark' ? 'rgba(110, 118, 129, 0.2)' : 'rgba(0, 104, 74, 0.1)'}`,
  backgroundColor: theme === 'dark' ? '#141920' : '#ffffff',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
});

const iconContainerStyle = (theme: 'light' | 'dark'): React.CSSProperties => ({
  width: '40px',
  height: '40px',
  borderRadius: '10px',
  backgroundColor: theme === 'dark' ? 'rgba(0, 237, 100, 0.1)' : 'rgba(0, 104, 74, 0.08)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const iconStyle: React.CSSProperties = {
  fontSize: '20px',
};

const cardContentStyle: React.CSSProperties = {
  flex: 1,
};

const cardTitleStyle = (theme: 'light' | 'dark'): React.CSSProperties => ({
  margin: '0 0 6px 0',
  fontSize: '14px',
  fontWeight: 600,
  color: theme === 'dark' ? '#e6edf3' : '#1a1a2e',
});

const cardDescStyle = (theme: 'light' | 'dark'): React.CSSProperties => ({
  margin: 0,
  fontSize: '12px',
  lineHeight: 1.5,
  color: theme === 'dark' ? '#8b949e' : '#5c6370',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

const tagsStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '4px',
  marginTop: '8px',
};

const tagStyle = (theme: 'light' | 'dark'): React.CSSProperties => ({
  padding: '2px 6px',
  fontSize: '10px',
  borderRadius: '4px',
  backgroundColor: theme === 'dark' ? 'rgba(110, 118, 129, 0.15)' : 'rgba(0, 104, 74, 0.06)',
  color: theme === 'dark' ? '#8b949e' : '#5c6370',
});

const categoryBadgeStyle = (theme: 'light' | 'dark'): React.CSSProperties => ({
  position: 'absolute',
  top: '12px',
  right: '12px',
  padding: '3px 8px',
  fontSize: '10px',
  fontWeight: 500,
  borderRadius: '4px',
  backgroundColor: theme === 'dark' ? 'rgba(0, 212, 170, 0.15)' : 'rgba(0, 150, 107, 0.1)',
  color: theme === 'dark' ? '#00D4AA' : '#00684A',
});

const importButtonStyle = (theme: 'light' | 'dark'): React.CSSProperties => ({
  padding: '8px 16px',
  fontSize: '12px',
  fontWeight: 500,
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  background: theme === 'dark'
    ? 'linear-gradient(135deg, #00ED64 0%, #00D4AA 100%)'
    : 'linear-gradient(135deg, #00684A 0%, #00966B 100%)',
  color: theme === 'dark' ? '#000' : '#fff',
  transition: 'all 0.15s ease',
  alignSelf: 'flex-start',
});

const loadingStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  fontSize: '14px',
};

const errorStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: '#f85149',
  fontSize: '14px',
};

export default App;
