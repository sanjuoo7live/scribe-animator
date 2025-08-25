import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';

interface TextTemplate {
  id: string;
  name: string;
  text: string;
  category: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  description: string;
  tags: string[];
}

const EnhancedTextLibrary: React.FC = () => {
  const { addObject, currentProject, currentTime } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Comprehensive text templates library
  const textTemplates: TextTemplate[] = useMemo(() => [
    // Headings
    { id: 'main-title', name: 'Main Title', text: 'Main Title', category: 'headings', fontSize: 48, fontFamily: 'Arial Black, sans-serif', fill: '#1F2937', fontWeight: 'bold', description: 'Large main heading', tags: ['title', 'heading', 'main', 'large', 'bold'] },
    { id: 'subtitle', name: 'Subtitle', text: 'Subtitle Text', category: 'headings', fontSize: 36, fontFamily: 'Arial, sans-serif', fill: '#374151', fontWeight: '600', description: 'Secondary heading', tags: ['subtitle', 'heading', 'secondary', 'medium'] },
    { id: 'section-header', name: 'Section Header', text: 'Section Header', category: 'headings', fontSize: 28, fontFamily: 'Arial, sans-serif', fill: '#4B5563', fontWeight: '600', description: 'Section title', tags: ['section', 'header', 'title', 'medium'] },
    { id: 'small-header', name: 'Small Header', text: 'Small Header', category: 'headings', fontSize: 20, fontFamily: 'Arial, sans-serif', fill: '#6B7280', fontWeight: '600', description: 'Small section header', tags: ['small', 'header', 'title', 'compact'] },

    // Body Text
    { id: 'body-large', name: 'Body Large', text: 'This is large body text that is easy to read and perfect for important content.', category: 'body', fontSize: 18, fontFamily: 'Arial, sans-serif', fill: '#1F2937', description: 'Large readable body text', tags: ['body', 'paragraph', 'large', 'readable'] },
    { id: 'body-medium', name: 'Body Medium', text: 'This is medium body text suitable for most content and descriptions.', category: 'body', fontSize: 16, fontFamily: 'Arial, sans-serif', fill: '#374151', description: 'Standard body text', tags: ['body', 'paragraph', 'medium', 'standard'] },
    { id: 'body-small', name: 'Body Small', text: 'This is small body text ideal for detailed descriptions and fine print.', category: 'body', fontSize: 14, fontFamily: 'Arial, sans-serif', fill: '#4B5563', description: 'Small detailed text', tags: ['body', 'small', 'detailed', 'fine'] },

    // Callouts & Emphasis
    { id: 'highlight', name: 'Highlighted Text', text: 'HIGHLIGHTED', category: 'emphasis', fontSize: 24, fontFamily: 'Arial Black, sans-serif', fill: '#DC2626', fontWeight: 'bold', description: 'Important highlighted text', tags: ['highlight', 'important', 'red', 'bold'] },
    { id: 'emphasis-blue', name: 'Blue Emphasis', text: 'Important Point', category: 'emphasis', fontSize: 20, fontFamily: 'Arial, sans-serif', fill: '#2563EB', fontWeight: 'bold', description: 'Blue emphasized text', tags: ['emphasis', 'blue', 'important', 'bold'] },
    { id: 'emphasis-green', name: 'Green Emphasis', text: 'Success Message', category: 'emphasis', fontSize: 20, fontFamily: 'Arial, sans-serif', fill: '#059669', fontWeight: 'bold', description: 'Green success text', tags: ['emphasis', 'green', 'success', 'positive'] },
    { id: 'warning', name: 'Warning Text', text: 'Warning Notice', category: 'emphasis', fontSize: 20, fontFamily: 'Arial, sans-serif', fill: '#D97706', fontWeight: 'bold', description: 'Orange warning text', tags: ['warning', 'orange', 'alert', 'caution'] },

    // Questions & Interactions
    { id: 'question', name: 'Question', text: 'What do you think?', category: 'interactive', fontSize: 22, fontFamily: 'Arial, sans-serif', fill: '#7C3AED', fontWeight: '600', description: 'Engaging question text', tags: ['question', 'interactive', 'engage', 'purple'] },
    { id: 'call-to-action', name: 'Call to Action', text: 'CLICK HERE', category: 'interactive', fontSize: 18, fontFamily: 'Arial Black, sans-serif', fill: '#FFFFFF', fontWeight: 'bold', description: 'Action button text', tags: ['cta', 'button', 'action', 'click'] },
    { id: 'learn-more', name: 'Learn More', text: 'Learn More →', category: 'interactive', fontSize: 16, fontFamily: 'Arial, sans-serif', fill: '#2563EB', fontWeight: '600', textDecoration: 'underline', description: 'Learn more link', tags: ['link', 'learn', 'more', 'arrow'] },

    // Lists & Bullets
    { id: 'bullet-point', name: 'Bullet Point', text: '• Key benefit or feature', category: 'lists', fontSize: 16, fontFamily: 'Arial, sans-serif', fill: '#374151', description: 'Bulleted list item', tags: ['bullet', 'list', 'point', 'item'] },
    { id: 'numbered-point', name: 'Numbered Point', text: '1. First important step', category: 'lists', fontSize: 16, fontFamily: 'Arial, sans-serif', fill: '#374151', description: 'Numbered list item', tags: ['number', 'list', 'step', 'order'] },
    { id: 'checkbox', name: 'Checkbox Item', text: '☑ Completed task', category: 'lists', fontSize: 16, fontFamily: 'Arial, sans-serif', fill: '#059669', description: 'Checked task item', tags: ['checkbox', 'task', 'complete', 'done'] },
    { id: 'arrow-point', name: 'Arrow Point', text: '→ Next step or action', category: 'lists', fontSize: 16, fontFamily: 'Arial, sans-serif', fill: '#6B7280', description: 'Arrow-pointed item', tags: ['arrow', 'next', 'step', 'direction'] },

    // Quotes & Citations
    { id: 'quote', name: 'Quote Text', text: '"This is an inspiring quote that adds credibility."', category: 'quotes', fontSize: 20, fontFamily: 'Georgia, serif', fill: '#4B5563', fontStyle: 'italic', description: 'Quoted text with quotation marks', tags: ['quote', 'citation', 'italic', 'testimony'] },
    { id: 'testimonial', name: 'Testimonial', text: 'Amazing results! Highly recommend this solution.', category: 'quotes', fontSize: 18, fontFamily: 'Arial, sans-serif', fill: '#374151', fontStyle: 'italic', description: 'Customer testimonial', tags: ['testimonial', 'review', 'customer', 'feedback'] },
    { id: 'attribution', name: 'Attribution', text: '— John Smith, CEO', category: 'quotes', fontSize: 14, fontFamily: 'Arial, sans-serif', fill: '#6B7280', description: 'Quote or testimonial attribution', tags: ['attribution', 'author', 'credit', 'name'] },

    // Numbers & Stats
    { id: 'big-number', name: 'Big Number', text: '95%', category: 'stats', fontSize: 60, fontFamily: 'Arial Black, sans-serif', fill: '#DC2626', fontWeight: 'bold', description: 'Large statistical number', tags: ['number', 'statistic', 'big', 'percentage'] },
    { id: 'metric', name: 'Metric', text: '1,234', category: 'stats', fontSize: 36, fontFamily: 'Arial, sans-serif', fill: '#2563EB', fontWeight: 'bold', description: 'Important metric or count', tags: ['metric', 'count', 'number', 'data'] },
    { id: 'currency', name: 'Currency', text: '$99.99', category: 'stats', fontSize: 32, fontFamily: 'Arial, sans-serif', fill: '#059669', fontWeight: 'bold', description: 'Price or currency amount', tags: ['currency', 'price', 'money', 'cost'] },
    { id: 'percentage', name: 'Percentage', text: '100% Satisfaction', category: 'stats', fontSize: 24, fontFamily: 'Arial, sans-serif', fill: '#7C3AED', fontWeight: '600', description: 'Percentage with description', tags: ['percentage', 'satisfaction', 'rate', 'success'] },

    // Labels & Tags
    { id: 'label', name: 'Label', text: 'LABEL', category: 'labels', fontSize: 12, fontFamily: 'Arial, sans-serif', fill: '#6B7280', fontWeight: 'bold', description: 'Small label or tag', tags: ['label', 'tag', 'small', 'category'] },
    { id: 'badge', name: 'Badge', text: 'NEW', category: 'labels', fontSize: 14, fontFamily: 'Arial Black, sans-serif', fill: '#FFFFFF', fontWeight: 'bold', description: 'Status badge', tags: ['badge', 'status', 'new', 'indicator'] },
    { id: 'category', name: 'Category', text: 'Category Name', category: 'labels', fontSize: 14, fontFamily: 'Arial, sans-serif', fill: '#7C3AED', fontWeight: '600', description: 'Content category', tags: ['category', 'classification', 'type', 'group'] },

    // Dates & Time
    { id: 'date', name: 'Date', text: 'March 15, 2024', category: 'datetime', fontSize: 16, fontFamily: 'Arial, sans-serif', fill: '#6B7280', description: 'Full date format', tags: ['date', 'time', 'calendar', 'when'] },
    { id: 'time', name: 'Time', text: '2:30 PM', category: 'datetime', fontSize: 16, fontFamily: 'Arial, sans-serif', fill: '#6B7280', description: 'Time format', tags: ['time', 'clock', 'when', 'schedule'] },
    { id: 'duration', name: 'Duration', text: '15 minutes', category: 'datetime', fontSize: 16, fontFamily: 'Arial, sans-serif', fill: '#6B7280', description: 'Time duration', tags: ['duration', 'time', 'length', 'period'] },

    // Creative & Decorative
    { id: 'fancy-title', name: 'Fancy Title', text: '✨ Special Title ✨', category: 'creative', fontSize: 28, fontFamily: 'Georgia, serif', fill: '#7C3AED', fontWeight: 'bold', description: 'Decorative title with emojis', tags: ['fancy', 'decorative', 'special', 'emoji'] },
    { id: 'handwritten', name: 'Handwritten Style', text: 'Personal Note', category: 'creative', fontSize: 20, fontFamily: 'Brush Script MT, cursive', fill: '#374151', fontStyle: 'italic', description: 'Handwritten-style text', tags: ['handwritten', 'personal', 'cursive', 'script'] },
    { id: 'tech-style', name: 'Tech Style', text: '>> SYSTEM READY', category: 'creative', fontSize: 18, fontFamily: 'Courier New, monospace', fill: '#059669', fontWeight: 'bold', description: 'Technical/coding style text', tags: ['tech', 'code', 'system', 'monospace'] },

    // Contact & Info
    { id: 'email', name: 'Email Address', text: 'contact@example.com', category: 'contact', fontSize: 16, fontFamily: 'Arial, sans-serif', fill: '#2563EB', textDecoration: 'underline', description: 'Email contact link', tags: ['email', 'contact', 'address', 'communication'] },
    { id: 'phone', name: 'Phone Number', text: '(555) 123-4567', category: 'contact', fontSize: 16, fontFamily: 'Arial, sans-serif', fill: '#374151', description: 'Phone number', tags: ['phone', 'contact', 'number', 'call'] },
    { id: 'website', name: 'Website URL', text: 'www.example.com', category: 'contact', fontSize: 16, fontFamily: 'Arial, sans-serif', fill: '#2563EB', textDecoration: 'underline', description: 'Website URL link', tags: ['website', 'url', 'link', 'web'] },
    { id: 'address', name: 'Address', text: '123 Main St, City, State 12345', category: 'contact', fontSize: 16, fontFamily: 'Arial, sans-serif', fill: '#6B7280', description: 'Physical address', tags: ['address', 'location', 'street', 'place'] }
  ], []);

  // Category options
  const categories = [
    { id: 'all', name: 'All Categories', icon: '📝' },
    { id: 'headings', name: 'Headings', icon: '📰' },
    { id: 'body', name: 'Body Text', icon: '📄' },
    { id: 'emphasis', name: 'Emphasis & Highlights', icon: '⭐' },
    { id: 'interactive', name: 'Interactive', icon: '🔗' },
    { id: 'lists', name: 'Lists & Bullets', icon: '📋' },
    { id: 'quotes', name: 'Quotes & Testimonials', icon: '💬' },
    { id: 'stats', name: 'Numbers & Stats', icon: '📊' },
    { id: 'labels', name: 'Labels & Tags', icon: '🏷️' },
    { id: 'datetime', name: 'Dates & Time', icon: '📅' },
    { id: 'creative', name: 'Creative & Decorative', icon: '✨' },
    { id: 'contact', name: 'Contact & Info', icon: '📞' }
  ];

  const addTextToCanvas = (template: TextTemplate) => {
    if (!currentProject) {
      alert('Please create a project first');
      return;
    }

    const textObj = {
      id: `text-${Date.now()}`,
      type: 'text' as const,
      x: Math.random() * 200 + 100,
      y: Math.random() * 200 + 100,
      width: Math.max(200, template.text.length * 8),
      height: Math.max(40, template.fontSize + 20),
      properties: {
        text: template.text,
        fontSize: template.fontSize,
        fill: template.fill,
        fontFamily: template.fontFamily,
        fontWeight: template.fontWeight || 'normal',
        fontStyle: template.fontStyle || 'normal',
        textDecoration: template.textDecoration || 'none',
        templateId: template.id,
        templateName: template.name,
        templateCategory: template.category
      },
      animation: {
        keyframes: [{ time: currentTime, properties: {} }]
      }
    };

    addObject(textObj);
    
    // Success notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white p-3 rounded-lg shadow-lg z-50 animate-pulse';
    notification.textContent = `📝 Added "${template.name}" to canvas!`;
    document.body.appendChild(notification);
    setTimeout(() => document.body.removeChild(notification), 2000);
  };

  // Filter text templates based on search and category
  const filteredTemplates = useMemo(() => {
    let filtered = textTemplates;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(search) ||
        template.text.toLowerCase().includes(search) ||
        template.description.toLowerCase().includes(search) ||
        template.tags.some(tag => tag.toLowerCase().includes(search))
      );
    }

    return filtered;
  }, [textTemplates, selectedCategory, searchTerm]);

  return (
    <div style={{ 
      height: '100%', 
      backgroundColor: '#111827', 
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '20px', 
        borderBottom: '1px solid #374151',
        flexShrink: 0,
        backgroundColor: '#111827'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          marginBottom: '16px'
        }}>
          <span style={{ fontSize: '28px' }}>📝</span>
          <div>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              margin: '0',
              color: 'white'
            }}>Text Templates Library</h3>
            <p style={{ 
              fontSize: '14px', 
              color: '#9CA3AF', 
              margin: '4px 0 0 0' 
            }}>
              Professional text styles and typography templates
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #4B5563', borderRadius: 8, overflow: 'hidden', backgroundColor: '#374151' }}>
            <span style={{ padding: '0 10px', color: '#9CA3AF' }}>🔎</span>
            <input
              type="text"
              placeholder="Search text templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 12px',
                backgroundColor: 'transparent',
                color: 'white',
                border: 'none',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} title="Clear search" aria-label="Clear search" style={{ padding: '8px 10px', color: '#9CA3AF', background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
            )}
          </div>
        </div>

        {/* Category Filter */}
        <div>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px', fontWeight: 'medium' }}>
            Category
          </div>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '6px'
          }}>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: selectedCategory === category.id ? '#10B981' : '#374151',
                  color: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: selectedCategory === category.id ? '600' : '400'
                }}
              >
                <span style={{ fontSize: '12px' }}>{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Text Templates Grid */}
      <div style={{ 
        flex: '1', 
        overflow: 'auto', 
        padding: '20px'
      }}>
        {filteredTemplates.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#6B7280', 
            padding: '60px 20px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
              No text templates found
            </div>
            <div style={{ fontSize: '14px' }}>
              Try adjusting your search or category filter
            </div>
          </div>
        ) : (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px'
          }}>
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => addTextToCanvas(template)}
                style={{
                  padding: '16px',
                  backgroundColor: '#374151',
                  border: '1px solid #4B5563',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#4B5563';
                  e.currentTarget.style.borderColor = '#10B981';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#374151';
                  e.currentTarget.style.borderColor = '#4B5563';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Template Preview */}
                <div style={{
                  fontSize: `${Math.min(template.fontSize * 0.6, 24)}px`,
                  fontFamily: template.fontFamily,
                  fontWeight: template.fontWeight || 'normal',
                  fontStyle: template.fontStyle || 'normal',
                  textDecoration: template.textDecoration || 'none',
                  color: '#FFFFFF', // White for preview
                  marginBottom: '4px',
                  wordBreak: 'break-word'
                }}>
                  {template.text}
                </div>
                
                {/* Template Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ 
                      fontSize: '13px', 
                      color: '#D1D5DB', 
                      fontWeight: '600',
                      marginBottom: '2px'
                    }}>
                      {template.name}
                    </div>
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#9CA3AF'
                    }}>
                      {template.description}
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: '10px', 
                    color: '#6B7280',
                    textAlign: 'right'
                  }}>
                    <div>{template.fontSize}px</div>
                    <div>{template.category}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div style={{ 
        padding: '12px 20px', 
        borderTop: '1px solid #374151',
        backgroundColor: '#111827',
        fontSize: '12px',
        color: '#9CA3AF',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0
      }}>
        <span style={{ color: '#10B981', fontSize: '14px' }}>📝</span>
        <span>
          {filteredTemplates.length} of {textTemplates.length} text templates
          {searchTerm && ` matching "${searchTerm}"`}
          {selectedCategory !== 'all' && ` in ${categories.find(c => c.id === selectedCategory)?.name}`}
        </span>
      </div>
    </div>
  );
};

export default EnhancedTextLibrary;
