interface YOOthemeElement {
  type: string;
  props?: Record<string, any>;
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
      type: "section",
      props: {
        layout: "default",
        style: "primary",
        padding: "default",
        vertical_align: "middle"
      },
      children: [
        {
          type: "row",
          props: {
            width: "default"
          },
          children: [
            {
              type: "column",
              props: {
                width: "1-1"
              },
              children: [
                {
                  type: "nav",
                  props: {
                    style: "default",
                    alignment: "left",
                    margin: "default"
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
    const layoutStructure = this.analyzeLayoutStructure(elements, allContent);
    
    const children: YOOthemeElement[] = [];
    const rows = this.organizeContentIntoRows(allContent, layoutStructure, elements);

    rows.forEach(row => {
      children.push({
        type: "row",
        props: {
          width: "default",
          gutter: row.gap || "default"
        },
        children: row.columns
      });
    });

    return {
      type: "section",
      props: {
        layout: "default",
        style: this.determineSectionStyle(elements, index),
        padding: this.determinePadding(elements),
        margin: "default",
        vertical_align: "top"
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

  private static analyzeLayoutStructure(elements: Element[], content: any[]): any {
    const structure = {
      columns: 1,
      isGrid: false,
      isFlex: false,
      hasCards: false,
      alignment: 'left',
      layout: 'single'
    };

    if (elements.length === 0) {
      return structure;
    }

    const primaryElement = elements[0];
    const className = primaryElement.className.toString();

    // Check for common grid/flexbox framework classes
    const isBootstrapRow = className.includes('row');
    const isTailwindGrid = className.includes('grid');

    if (isBootstrapRow) {
      const directChildrenCols = Array.from(primaryElement.children).filter(child =>
        child.className.toString().includes('col-')
      );
      if (directChildrenCols.length > 1) {
        structure.columns = Math.min(directChildrenCols.length, 4);
        structure.layout = 'multi-column';
        structure.isGrid = true;
        return structure;
      }
    }

    if (isTailwindGrid) {
      const gridColsMatch = className.match(/grid-cols-(\d+)/);
      if (gridColsMatch && parseInt(gridColsMatch[1]) > 1) {
        structure.columns = Math.min(parseInt(gridColsMatch[1]), 4);
        structure.layout = 'multi-column';
        structure.isGrid = true;
        return structure;
      }
    }

    // Generic check for multiple significant direct children
    const significantChildren = Array.from(primaryElement.children).filter(child =>
      this.hasSignificantContent(child) && (child.tagName.toLowerCase() === 'div' || child.tagName.toLowerCase() === 'article' || child.tagName.toLowerCase() === 'section')
    );

    if (significantChildren.length > 1 && significantChildren.length <= 4) {
      structure.columns = significantChildren.length;
      structure.layout = 'multi-column';
      if (className.includes('flex')) {
        structure.isFlex = true;
      }
      if (className.includes('grid')) {
        structure.isGrid = true;
      }
      return structure;
    }

    return structure;
  }

  private static organizeContentIntoRows(content: any[], structure: any, originalElements: Element[]): any[] {
    if (structure.layout === 'multi-column' && originalElements.length > 0) {
      const container = originalElements[0];
      const columnElements = Array.from(container.children).filter(child =>
        this.hasSignificantContent(child)
      );

      if (columnElements.length === structure.columns) {
        const columns = columnElements.map(colEl => {
          const columnContent = this.extractComprehensiveContent([colEl]);
          return {
            type: "column",
            props: {
              width: this.getColumnWidth(structure.columns)
            },
            children: columnContent.map(item => this.convertContentToYOOtheme(item))
          };
        });

        return [{
          columns,
          gap: structure.isGrid ? "large" : "default"
        }];
      }
    }
    
    // Fallback to single column layout
    const singleColumn = {
      type: "column",
      props: {
        width: "1-1"
      },
      children: content.map(item => this.convertContentToYOOtheme(item))
    };

    return [{
      columns: [singleColumn],
      gap: "default"
    }];
  }

  private static getColumnWidth(columnCount: number): string {
    switch (columnCount) {
      case 2: return "1-2";
      case 3: return "1-3";
      case 4: return "1-4";
      default: return "1-1";
    }
  }

  private static convertContentToYOOtheme(item: any): YOOthemeElement {
    switch (item.type) {
      case 'heading':
        return {
          type: "heading",
          props: {
            content: item.content,
            heading_element: item.tag,
            heading_style: item.level <= 2 ? "h1" : "default",
            margin: "default"
          }
        };
      
      case 'text':
        return {
          type: "text",
          props: {
            content: item.content,
            margin: "default"
          }
        };
      
      case 'image':
        return {
          type: "image",
          props: {
            image: item.src,
            image_alt: item.alt,
            image_width: item.width || "",
            image_height: item.height || "",
            border_radius: "default",
            margin: "default"
          }
        };
      
      case 'list':
        return {
          type: "list",
          props: {
            list_style: item.ordered ? "decimal" : "disc",
            content: item.items.map((listItem: string) => ({ content: listItem })),
            margin: "default"
          }
        };
      
      case 'button':
        return {
          type: "button",
          props: {
            content: item.content,
            link: item.href,
            style: item.style,
            size: "default",
            margin: "default"
          }
        };
      
      case 'form':
        return {
          type: "html",
          props: {
            content: `<form action="${item.action}" method="${item.method}">
              ${item.inputs.map((input: any) => 
                `<div class="uk-margin"><input class="uk-input" type="${input.type}" name="${input.name}" placeholder="${input.placeholder}" ${input.required ? 'required' : ''}></div>`
              ).join('\n')}
              <button class="uk-button uk-button-primary" type="submit">Submit</button>
            </form>`,
            margin: "default"
          }
        };
      
      case 'table':
        return {
          type: "table",
          props: {
            table_style: "striped",
            content: {
              head: [item.headers],
              body: item.rows
            },
            margin: "default"
          }
        };
      
      case 'video':
      case 'iframe':
        return {
          type: "video",
          props: {
            video: item.src,
            video_width: item.width || "1920",
            video_height: item.height || "1080",
            margin: "default"
          }
        };
      
      default:
        return {
          type: "html",
          props: {
            content: item.content || '',
            margin: "default"
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
    
    if (hasHero) return "primary";
    if (index === 0) return "default";
    if (index % 2 === 0) return "muted";
    return "default";
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
      type: "section",
      props: {
        layout: "default",
        style: "secondary",
        padding: "default",
        vertical_align: "top"
      },
      children: [
        {
          type: "row",
          props: {
            width: "default"
          },
          children: [
            {
              type: "column",
              props: {
                width: "1-1"
              },
              children: [
                {
                  type: "text",
                  props: {
                    content: footerText,
                    text_align: "center",
                    margin: "default"
                  }
                }
              ]
            }
          ]
        }
      ]
    };
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