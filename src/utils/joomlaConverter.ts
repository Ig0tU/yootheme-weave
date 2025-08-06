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
    const header = doc.querySelector('header') || doc.querySelector('nav');
    if (header) {
      sections.push(this.createHeaderSection(header));
    }

    // Main content sections
    const mainSections = doc.querySelectorAll('main section, section, article');
    mainSections.forEach((section, index) => {
      sections.push(this.createContentSection(section, index));
    });

    // If no sections found, create a basic section from body
    if (sections.length === 0) {
      const body = doc.querySelector('body');
      if (body) {
        sections.push(this.createContentSection(body, 0));
      }
    }

    // Footer section
    const footer = doc.querySelector('footer');
    if (footer) {
      sections.push(this.createFooterSection(footer));
    }

    return sections;
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

  private static createContentSection(element: Element, index: number): YOOthemeElement {
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const paragraphs = element.querySelectorAll('p');
    const images = element.querySelectorAll('img');
    const buttons = element.querySelectorAll('button, .btn, a[class*="btn"]');

    const children: YOOthemeElement[] = [];

    // Create columns based on content layout
    const columnCount = this.determineColumnCount(element);
    const columnWidth = columnCount === 1 ? "100%" : `${100 / columnCount}%`;

    for (let i = 0; i < columnCount; i++) {
      const column: YOOthemeElement = {
        type: "column",
        settings: { width: columnWidth },
        children: []
      };

      // Add headings
      if (headings[i]) {
        column.children!.push({
          type: "heading",
          settings: {
            content: headings[i].textContent?.trim() || '',
            tag: headings[i].tagName.toLowerCase(),
            style: "default"
          }
        });
      }

      // Add text content
      if (paragraphs[i]) {
        column.children!.push({
          type: "text",
          settings: {
            content: paragraphs[i].textContent?.trim() || '',
            margin: "default"
          }
        });
      }

      // Add images
      if (images[i]) {
        column.children!.push({
          type: "image",
          settings: {
            image: images[i].getAttribute('src') || '',
            alt: images[i].getAttribute('alt') || '',
            width: "auto",
            height: "auto"
          }
        });
      }

      // Add buttons
      if (buttons[i]) {
        column.children!.push({
          type: "button",
          settings: {
            content: buttons[i].textContent?.trim() || '',
            style: "primary",
            link: buttons[i].getAttribute('href') || '#'
          }
        });
      }

      children.push(column);
    }

    return {
      type: "section",
      settings: {
        style: index === 0 ? "primary" : "default",
        padding: "large",
        margin: "default"
      },
      children: [
        {
          type: "row",
          settings: {},
          children
        }
      ]
    };
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
    
    const images = Array.from(doc.querySelectorAll('img'))
      .map(img => img.getAttribute('src'))
      .filter(Boolean) as string[];

    const styles = Array.from(doc.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(style => {
        if (style.tagName === 'STYLE') {
          return style.textContent || '';
        } else {
          return `@import url('${style.getAttribute('href')}');`;
        }
      })
      .join('\n');

    return {
      images: images.map(img => `/media/converted/${img.split('/').pop()}`),
      styles: styles || '/* Converted styles */'
    };
  }
}