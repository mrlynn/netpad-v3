/**
 * Template Gallery Widget for ChatGPT
 *
 * An interactive template browser that renders in ChatGPT conversations.
 * Uses the OpenAI Apps SDK runtime (window.openai) for data and interactions.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

// =============================================================================
// Types
// =============================================================================

interface TemplateItem {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  tags?: string[];
  fieldCount?: number;
  type?: string;
}

interface TemplateGalleryData {
  templates: TemplateItem[];
  templateType: 'form' | 'workflow' | 'application';
  categories: string[];
  selectedCategory?: string;
  theme: 'light' | 'dark';
  showSearch?: boolean;
}

interface OpenAIGlobal {
  toolOutput?: {
    structuredContent?: TemplateGalleryData;
    _meta?: Record<string, unknown>;
  };
  theme?: 'light' | 'dark';
  callTool?: (name: string, args: Record<string, unknown>) => Promise<void>;
  sendFollowUpMessage?: (message: string) => void;
  notifyIntrinsicHeight?: (height: number) => void;
}

declare global {
  interface Window {
    openai?: OpenAIGlobal;
  }
}

// =============================================================================
// Hooks
// =============================================================================

function useOpenAI(): OpenAIGlobal | undefined {
  const [openai, setOpenai] = useState<OpenAIGlobal | undefined>(window.openai);

  useEffect(() => {
    const handleSetGlobals = () => {
      setOpenai({ ...window.openai });
    };

    window.addEventListener('openai:set_globals', handleSetGlobals);
    return () => window.removeEventListener('openai:set_globals', handleSetGlobals);
  }, []);

  return openai;
}

// =============================================================================
// Components
// =============================================================================

function CategoryChip({
  category,
  isSelected,
  onClick,
  count,
}: {
  category: string;
  isSelected: boolean;
  onClick: () => void;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px',
        borderRadius: '20px',
        border: 'none',
        background: isSelected ? '#6366f1' : '#2a2a2a',
        color: isSelected ? '#fff' : '#aaa',
        fontSize: '13px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.15s ease',
      }}
    >
      {category}
      <span
        style={{
          background: isSelected ? 'rgba(255,255,255,0.2)' : '#3a3a3a',
          padding: '2px 6px',
          borderRadius: '10px',
          fontSize: '11px',
        }}
      >
        {count}
      </span>
    </button>
  );
}

function TemplateCard({
  template,
  onUse,
  onLearnMore,
}: {
  template: TemplateItem;
  onUse: () => void;
  onLearnMore: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isHovered ? '#2a2a2a' : '#222',
        borderRadius: '12px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        transform: isHovered ? 'translateY(-2px)' : 'none',
        boxShadow: isHovered ? '0 8px 24px rgba(0,0,0,0.3)' : 'none',
        border: '1px solid #333',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span style={{ fontSize: '28px' }}>{template.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#fff' }}>
            {template.name}
          </h3>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '13px',
              color: '#888',
              lineHeight: 1.4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {template.description}
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid #333',
        }}
      >
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '11px',
              padding: '3px 8px',
              background: '#3a3a3a',
              borderRadius: '6px',
              color: '#aaa',
            }}
          >
            {template.category}
          </span>
          {template.fieldCount !== undefined && (
            <span
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                background: '#3a3a3a',
                borderRadius: '6px',
                color: '#aaa',
              }}
            >
              {template.fieldCount} fields
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLearnMore();
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #444',
              background: 'transparent',
              color: '#aaa',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Learn more
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUse();
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: '#6366f1',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Use template
          </button>
        </div>
      </div>
    </div>
  );
}

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        placeholder="Search templates..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 12px 10px 36px',
          borderRadius: '8px',
          border: '1px solid #333',
          background: '#1a1a1a',
          color: '#fff',
          fontSize: '14px',
          outline: 'none',
        }}
      />
      <span
        style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#666',
        }}
      >
        🔍
      </span>
    </div>
  );
}

function LoadingState() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px',
        color: '#888',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            border: '3px solid #333',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 12px',
          }}
        />
        <p>Loading templates...</p>
      </div>
    </div>
  );
}

function EmptyState({ search }: { search: string }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '40px',
        color: '#888',
      }}
    >
      <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>
        🔍
      </span>
      <p>No templates found {search ? `for "${search}"` : ''}</p>
    </div>
  );
}

// =============================================================================
// Main App
// =============================================================================

function TemplateGallery() {
  const openai = useOpenAI();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const data = openai?.toolOutput?.structuredContent;

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    if (!data?.templates) return [];

    let result = data.templates;

    if (selectedCategory) {
      result = result.filter((t) => t.category === selectedCategory);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          t.description.toLowerCase().includes(searchLower) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    }

    return result;
  }, [data?.templates, selectedCategory, search]);

  // Count templates per category
  const categoryCounts = useMemo(() => {
    if (!data?.templates) return {};

    return data.templates.reduce(
      (acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [data?.templates]);

  // Notify height changes
  useEffect(() => {
    const notifyHeight = () => {
      openai?.notifyIntrinsicHeight?.(document.body.scrollHeight);
    };
    notifyHeight();
    window.addEventListener('resize', notifyHeight);
    return () => window.removeEventListener('resize', notifyHeight);
  }, [filteredTemplates, openai]);

  // Handle template actions
  const handleUseTemplate = (template: TemplateItem) => {
    if (openai?.callTool) {
      openai.callTool('create_form', { templateId: template.id });
    }
  };

  const handleLearnMore = (template: TemplateItem) => {
    if (openai?.sendFollowUpMessage) {
      openai.sendFollowUpMessage(
        `Tell me more about the "${template.name}" template. What fields does it include and what is it best used for?`
      );
    }
  };

  if (!data) {
    return <LoadingState />;
  }

  return (
    <div
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        background: '#1a1a1a',
        color: '#fff',
        padding: '20px',
        minHeight: '200px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600 }}>
          {data.templateType === 'form' ? '📝' : data.templateType === 'workflow' ? '⚡' : '📦'}{' '}
          {data.templateType.charAt(0).toUpperCase() + data.templateType.slice(1)} Templates
        </h2>
        <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>
          {data.templates.length} templates available • Click "Use template" to get started
        </p>
      </div>

      {/* Search */}
      {data.showSearch !== false && (
        <div style={{ marginBottom: '16px' }}>
          <SearchInput value={search} onChange={setSearch} />
        </div>
      )}

      {/* Category Filters */}
      {data.categories.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: '20px',
          }}
        >
          <CategoryChip
            category="All"
            isSelected={!selectedCategory}
            onClick={() => setSelectedCategory(null)}
            count={data.templates.length}
          />
          {data.categories.map((cat) => (
            <CategoryChip
              key={cat}
              category={cat}
              isSelected={selectedCategory === cat}
              onClick={() => setSelectedCategory(cat)}
              count={categoryCounts[cat] || 0}
            />
          ))}
        </div>
      )}

      {/* Template Grid */}
      {filteredTemplates.length === 0 ? (
        <EmptyState search={search} />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onUse={() => handleUseTemplate(template)}
              onLearnMore={() => handleLearnMore(template)}
            />
          ))}
        </div>
      )}

      {/* CSS Animation */}
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

// =============================================================================
// Mount
// =============================================================================

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<TemplateGallery />);
}

export default TemplateGallery;
