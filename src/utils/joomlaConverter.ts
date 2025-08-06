interface YOOthemeElement {
  type: string;
  settings: Record<string, any>;
  children?: YOOthemeElement[];
}

interface JoomlaConversion {
  joomla_version: string;
  yootheme: {
    template: string;
    version: string;
    builder_config: {
      sections: YOOthemeElement[];
    };
  };
  assets: {
    images: string[];
    styles: string;
  };
}

interface WebsiteData {
  content: string;
  markdown: string;
  html: string;
  metadata: {
    title: string;
    description: string;
    language: string;
    sourceURL: string;
  };
}

export class JoomlaConverter {
  static convertWebsiteToJoomla(data: WebsiteData): JoomlaConversion {
    const { html, metadata } = data;
    const sections = this.parseHtmlToSections(html);
    const assets = this.extractAssets(html);

    return {
      joomla_version: "4.3+",
      yootheme: {
        template: "YOOtheme Pro",
        version: "3.2+",
        builder_config: {
          sections
        }
      },
      assets
    };
  }

  private static parseHtmlToSections(html: string): YOOthemeElement[] {
    const sections: YOOthemeElement[] = [];
    
    // Create a temporary DOM to parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Header section
    const headerElements = doc.querySelectorAll('header, nav, .header, .navbar, .nav-menu, [role="banner"]');
    if (headerElements.length > 0) {
      sections.push(this.createHeaderSection(headerElements[0]));
    }

    // Comprehensive content discovery
    const allContentElements = this.discoverContentElements(doc);
    const groupedContent = this.groupContentByVisualSections(allContentElements);
    
    groupedContent.forEach((group, index) => {
      sections.push(this.createAdvancedContentSection(group, index));
    });

    // If still no sections found, process entire body
    if (sections.length <= 1) {
      const bodyContent = this.extractBodyContent(doc);
      if (bodyContent.length > 0) {
        bodyContent.forEach((content, index) => {
          sections.push(this.createAdvancedContentSection([content], index + sections.length));
        });
      }
    }

    // Footer section
    const footerElements = doc.querySelectorAll('footer, .footer, [role="contentinfo"]');
    if (footerElements.length > 0) {
      sections.push(this.createFooterSection(footerElements[0]));
    }

    return sections;
  }

  private static discoverContentElements(doc: Document): Element[] {
    const contentSelectors = [
      'main', 'section', 'article', 'div[class*="section"]', 'div[class*="content"]',
      'div[class*="container"]', 'div[class*="wrapper"]', 'div[class*="row"]',
      'div[id*="section"]', 'div[id*="content"]', '.hero', '.banner', '.feature',
      '.testimonial', '.gallery', '.portfolio', '.about', '.service', '.product',
      'aside', '.sidebar', '.widget', '.block', 'form', 'table', '.card',
      'ul.menu', 'ul.list', 'dl', '.accordion', '.tabs', '.carousel'
    ];

    const elements: Element[] = [];
    contentSelectors.forEach(selector => {
      const found = doc.querySelectorAll(selector);
      found.forEach(el => {
        if (!this.isNestedElement(el, elements) && this.hasSignificantContent(el)) {
          elements.push(el);
        }
      });
    });

    return elements;
  }

  private static isNestedElement(element: Element, existingElements: Element[]): boolean {
    return existingElements.some(existing => 
      existing.contains(element) || element.contains(existing)
    );
  }

  private static hasSignificantContent(element: Element): boolean {
    const text = element.textContent?.trim() || '';
    const hasImages = element.querySelectorAll('img').length > 0;
    const hasMedia = element.querySelectorAll('video, audio, iframe').length > 0;
    const hasForm = element.querySelectorAll('form, input, textarea, select').length > 0;
    
    return text.length > 20 || hasImages || hasMedia || hasForm;
  }

  private static groupContentByVisualSections(elements: Element[]): Element[][] {
    const groups: Element[][] = [];
    let currentGroup: Element[] = [];

    elements.forEach((element, index) => {
      const isVisualBreak = this.isVisualSectionBreak(element, elements[index - 1]);
      
      if (isVisualBreak && currentGroup.length > 0) {
        groups.push([...currentGroup]);
        currentGroup = [element];
      } else {
        currentGroup.push(element);
      }
    });

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups.length > 0 ? groups : [elements];
  }

  private static isVisualSectionBreak(element: Element, previousElement?: Element): boolean {
    if (!previousElement) return true;
    
    const breakSelectors = ['section', 'article', 'main', '.hero', '.banner'];
    const isBreakElement = breakSelectors.some(selector => 
      element.matches(selector) || element.classList.toString().includes(selector.replace('.', ''))
    );
    
    return isBreakElement;
  }

  private static extractBodyContent(doc: Document): Element[] {
    const bodyElements: Element[] = [];
    const body = doc.querySelector('body');
    
    if (body) {
      const walker = doc.createTreeWalker(
        body,
        NodeFilter.SHOW_ELEMENT,
        {
          acceptNode: (node) => {
            const element = node as Element;
            if (this.isContentElement(element) && this.hasSignificantContent(element)) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_SKIP;
          }
        }
      );

      let node = walker.nextNode();
      while (node) {
        bodyElements.push(node as Element);
        node = walker.nextNode();
      }
    }

    return bodyElements;
  }

  private static isContentElement(element: Element): boolean {
    const contentTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span', 'article', 'section'];
    return contentTags.includes(element.tagName.toLowerCase()) && 
           !element.closest('nav, header, footer, script, style');
  }

  private static createHeaderSection(element: Element): YOOthemeElement {
    const nav = element.querySelector('nav') || element;
    const links = Array.from(nav.querySelectorAll('a')).map(a => ({
      text: a.textContent?.trim() || '',
      href: a.getAttribute('href') || '#'
    }));

    return {
      type: "header",
      settings: {
        layout: "stacked",
        background: "primary",
        padding: "default"
      },
      children: [
        {
          type: "row",
          settings: {},
          children: [
            {
              type: "column",
              settings: { width: "100%" },
              children: [
                {
                  type: "menu",
                  settings: {
                    menu: "mainmenu",
                    style: "nav",
                    items: links
                  }
                }
              ]
            }
          ]
        }
      ]
    };
  }

  private static createAdvancedContentSection(elements: Element[], index: number): YOOthemeElement {
    const allContent = this.extractComprehensiveContent(elements);
    const layoutStructure = this.analyzeLayoutStructure(elements);
    
    const children: YOOthemeElement[] = [];
    const rows = this.organizeContentIntoRows(allContent, layoutStructure);

    rows.forEach(row => {
      children.push({
        type: "row",
        settings: {
          gap: row.gap || "default",
          alignment: row.alignment || "stretch"
        },
        children: row.columns
      });
    });

    return {
      type: "section",
      settings: {
        style: this.determineSectionStyle(elements, index),
        padding: this.determinePadding(elements),
        margin: "default",
        background: this.extractBackgroundStyle(elements)
      },
      children
    };
  }

  private static extractComprehensiveContent(elements: Element[]): any[] {
    const content: any[] = [];

    elements.forEach(element => {
      // Headings
      const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach(heading => {
        content.push({
          type: 'heading',
          element: heading,
          content: heading.textContent?.trim() || '',
          tag: heading.tagName.toLowerCase(),
          level: parseInt(heading.tagName.substring(1))
        });
      });

      // Text content (paragraphs, divs with text)
      const textElements = element.querySelectorAll('p, div, span');
      textElements.forEach(textEl => {
        const text = textEl.textContent?.trim() || '';
        if (text.length > 15 && !textEl.querySelector('img, video, iframe, button, a')) {
          content.push({
            type: 'text',
            element: textEl,
            content: text
          });
        }
      });

      // Images
      const images = element.querySelectorAll('img');
      images.forEach(img => {
        content.push({
          type: 'image',
          element: img,
          src: img.getAttribute('src') || '',
          alt: img.getAttribute('alt') || '',
          width: img.getAttribute('width'),
          height: img.getAttribute('height')
        });
      });

      // Lists
      const lists = element.querySelectorAll('ul, ol');
      lists.forEach(list => {
        const items = Array.from(list.querySelectorAll('li')).map(li => li.textContent?.trim() || '');
        if (items.length > 0) {
          content.push({
            type: 'list',
            element: list,
            items,
            ordered: list.tagName.toLowerCase() === 'ol'
          });
        }
      });

      // Buttons and links
      const buttons = element.querySelectorAll('button, a[class*="btn"], .button, input[type="submit"]');
      buttons.forEach(btn => {
        const text = btn.textContent?.trim() || '';
        if (text.length > 0) {
          content.push({
            type: 'button',
            element: btn,
            content: text,
            href: btn.getAttribute('href') || btn.getAttribute('data-href') || '#',
            style: this.determineButtonStyle(btn)
          });
        }
      });

      // Forms
      const forms = element.querySelectorAll('form');
      forms.forEach(form => {
        const inputs = Array.from(form.querySelectorAll('input, textarea, select')).map(input => ({
          type: input.getAttribute('type') || input.tagName.toLowerCase(),
          name: input.getAttribute('name') || '',
          placeholder: input.getAttribute('placeholder') || '',
          required: input.hasAttribute('required')
        }));
        
        if (inputs.length > 0) {
          content.push({
            type: 'form',
            element: form,
            action: form.getAttribute('action') || '',
            method: form.getAttribute('method') || 'post',
            inputs
          });
        }
      });

      // Tables
      const tables = element.querySelectorAll('table');
      tables.forEach(table => {
        const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim() || '');
        const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr => 
          Array.from(tr.querySelectorAll('td')).map(td => td.textContent?.trim() || '')
        );
        
        if (headers.length > 0 || rows.length > 0) {
          content.push({
            type: 'table',
            element: table,
            headers,
            rows
          });
        }
      });

      // Media (video, audio, iframe)
      const media = element.querySelectorAll('video, audio, iframe');
      media.forEach(mediaEl => {
        content.push({
          type: mediaEl.tagName.toLowerCase(),
          element: mediaEl,
          src: mediaEl.getAttribute('src') || '',
          width: mediaEl.getAttribute('width'),
          height: mediaEl.getAttribute('height')
        });
      });
    });

    return content;
  }

  private static analyzeLayoutStructure(elements: Element[]): any {
    const structure = {
      columns: 1,
      isGrid: false,
      isFlex: false,
      hasCards: false,
      alignment: 'left'
    };

    elements.forEach(element => {
      const computedStyle = window.getComputedStyle ? window.getComputedStyle(element) : null;
      const className = element.className.toString();
      
      // Detect grid/flex layouts
      if (className.includes('grid') || className.includes('col-')) {
        structure.isGrid = true;
        const colMatches = className.match(/col-(\d+)|grid-cols-(\d+)/);
        if (colMatches) {
          structure.columns = Math.max(structure.columns, parseInt(colMatches[1] || colMatches[2]));
        }
      }
      
      if (className.includes('flex') || className.includes('row')) {
        structure.isFlex = true;
      }
      
      if (className.includes('card') || className.includes('panel')) {
        structure.hasCards = true;
      }

      // Count direct children as potential columns
      const directChildren = Array.from(element.children).filter(child => 
        this.hasSignificantContent(child)
      );
      structure.columns = Math.max(structure.columns, Math.min(directChildren.length, 4));
    });

    return structure;
  }

  private static organizeContentIntoRows(content: any[], structure: any): any[] {
    const rows: any[] = [];
    const itemsPerRow = structure.columns;
    
    for (let i = 0; i < content.length; i += itemsPerRow) {
      const rowContent = content.slice(i, i + itemsPerRow);
      const columns = rowContent.map((item, colIndex) => ({
        type: "column",
        settings: { 
          width: `${100 / Math.max(rowContent.length, 1)}%`,
          alignment: structure.alignment
        },
        children: [this.convertContentToYOOtheme(item)]
      }));

      rows.push({
        columns,
        gap: structure.isGrid ? "large" : "default",
        alignment: structure.isFlex ? "center" : "stretch"
      });
    }

    return rows.length > 0 ? rows : [{
      columns: [{
        type: "column",
        settings: { width: "100%" },
        children: content.map(item => this.convertContentToYOOtheme(item))
      }],
      gap: "default",
      alignment: "stretch"
    }];
  }

  private static convertContentToYOOtheme(item: any): YOOthemeElement {
    switch (item.type) {
      case 'heading':
        return {
          type: "heading",
          settings: {
            content: item.content,
            tag: item.tag,
            style: item.level <= 2 ? "primary" : "default",
            margin: "small"
          }
        };
      
      case 'text':
        return {
          type: "text",
          settings: {
            content: item.content,
            margin: "default"
          }
        };
      
      case 'image':
        return {
          type: "image",
          settings: {
            image: item.src,
            alt: item.alt,
            width: item.width || "auto",
            height: item.height || "auto",
            border: "rounded"
          }
        };
      
      case 'list':
        return {
          type: "list",
          settings: {
            items: item.items,
            style: item.ordered ? "numbered" : "bullet",
            marker: "default"
          }
        };
      
      case 'button':
        return {
          type: "button",
          settings: {
            content: item.content,
            link: item.href,
            style: item.style,
            size: "default"
          }
        };
      
      case 'form':
        return {
          type: "html",
          settings: {
            content: `<form action="${item.action}" method="${item.method}">
              ${item.inputs.map((input: any) => 
                `<input type="${input.type}" name="${input.name}" placeholder="${input.placeholder}" ${input.required ? 'required' : ''}>`
              ).join('\n')}
            </form>`
          }
        };
      
      case 'table':
        return {
          type: "table",
          settings: {
            headers: item.headers,
            rows: item.rows,
            style: "striped"
          }
        };
      
      case 'video':
      case 'iframe':
        return {
          type: "video",
          settings: {
            source: item.src,
            width: item.width || "100%",
            height: item.height || "auto"
          }
        };
      
      default:
        return {
          type: "html",
          settings: {
            content: item.content || ''
          }
        };
    }
  }

  private static determineSectionStyle(elements: Element[], index: number): string {
    const hasHero = elements.some(el => 
      el.classList.toString().includes('hero') || 
      el.classList.toString().includes('banner') ||
      el.classList.toString().includes('jumbotron')
    );
    
    if (hasHero) return "hero";
    if (index === 0) return "primary";
    if (index % 2 === 0) return "default";
    return "muted";
  }

  private static determinePadding(elements: Element[]): string {
    const hasLargeContent = elements.some(el => {
      const text = el.textContent?.trim() || '';
      return text.length > 500 || el.querySelectorAll('img, video').length > 2;
    });
    
    return hasLargeContent ? "large" : "default";
  }

  private static extractBackgroundStyle(elements: Element[]): string {
    // Try to detect background styles from classes
    const bgClasses = ['bg-', 'background-', 'section-'];
    for (const element of elements) {
      const className = element.className.toString();
      for (const bgClass of bgClasses) {
        if (className.includes(bgClass)) {
          if (className.includes('dark')) return "dark";
          if (className.includes('light')) return "light";
          if (className.includes('primary')) return "primary";
        }
      }
    }
    return "default";
  }

  private static determineButtonStyle(element: Element): string {
    const className = element.className.toString().toLowerCase();
    if (className.includes('primary') || className.includes('main')) return "primary";
    if (className.includes('secondary')) return "secondary";
    if (className.includes('outline')) return "outline";
    if (className.includes('ghost')) return "text";
    return "default";
  }

  private static createFooterSection(element: Element): YOOthemeElement {
    const footerText = element.textContent?.trim() || '';
    const links = Array.from(element.querySelectorAll('a')).map(a => ({
      text: a.textContent?.trim() || '',
      href: a.getAttribute('href') || '#'
    }));

    return {
      type: "footer",
      settings: {
        style: "secondary",
        padding: "default"
      },
      children: [
        {
          type: "row",
          settings: {},
          children: [
            {
              type: "column",
              settings: { width: "100%" },
              children: [
                {
                  type: "text",
                  settings: {
                    content: footerText,
                    align: "center"
                  }
                },
                ...(links.length > 0 ? [{
                  type: "menu",
                  settings: {
                    style: "footer",
                    items: links
                  }
                }] : [])
              ]
            }
          ]
        }
      ]
    };
  }

  private static determineColumnCount(element: Element): number {
    const flexElements = element.querySelectorAll('[class*="flex"], [class*="grid"], [class*="col"]');
    const directChildren = element.children.length;
    
    if (flexElements.length > 0) {
      return Math.min(flexElements.length, 3);
    }
    
    if (directChildren > 3) {
      return 2;
    }
    
    return 1;
  }

  private static extractAssets(html: string): { images: string[]; styles: string } {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Extract all images including background images
    const images = new Set<string>();
    
    // Standard img tags
    doc.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src');
      if (src) images.add(src);
    });
    
    // Background images from inline styles
    doc.querySelectorAll('*').forEach(el => {
      const style = el.getAttribute('style');
      if (style && style.includes('background-image')) {
        const match = style.match(/background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/);
        if (match && match[1]) images.add(match[1]);
      }
    });
    
    // Images from CSS content
    const styleElements = doc.querySelectorAll('style');
    styleElements.forEach(styleEl => {
      const cssText = styleEl.textContent || '';
      const matches = cssText.match(/url\(['"]?([^'")\s]+)['"]?\)/g);
      if (matches) {
        matches.forEach(match => {
          const url = match.match(/url\(['"]?([^'")\s]+)['"]?\)/);
          if (url && url[1]) images.add(url[1]);
        });
      }
    });

    // Extract comprehensive styles
    const styles: string[] = [];
    
    // Inline styles
    doc.querySelectorAll('style').forEach(style => {
      const cssText = style.textContent || '';
      if (cssText.trim()) {
        styles.push(cssText);
      }
    });
    
    // External stylesheets
    doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
      const href = link.getAttribute('href');
      if (href) {
        styles.push(`@import url('${href}');`);
      }
    });
    
    // Extract color variables and custom properties
    const bodyStyle = doc.querySelector('body')?.getAttribute('style') || '';
    if (bodyStyle) {
      styles.push(`body { ${bodyStyle} }`);
    }
    
    // Create comprehensive CSS for Joomla
    const joomlaCSS = `
/* Converted from original website */
${styles.join('\n\n')}

/* YOOtheme compatibility styles */
.uk-section { padding: 60px 0; }
.uk-container { max-width: 1200px; margin: 0 auto; padding: 0 15px; }
.uk-grid { display: flex; flex-wrap: wrap; margin-left: -15px; }
.uk-grid > * { padding-left: 15px; }
.uk-width-1-2 { width: 50%; }
.uk-width-1-3 { width: 33.333%; }
.uk-width-1-4 { width: 25%; }
.uk-text-center { text-align: center; }
.uk-margin { margin-bottom: 20px; }
    `;

    return {
      images: Array.from(images).map(img => {
        const filename = img.split('/').pop() || 'image.jpg';
        return `/media/converted/${filename}`;
      }),
      styles: joomlaCSS
    };
  }
}