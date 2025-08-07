interface YOOthemePageBuilderElement {
  name: string;
  title: string;
  group: "layout" | "media" | "multiple items";
  icon: string;
  iconSmall: string;
  element: boolean;
  container: boolean;
  width: number;
  defaults: Record<string, any>;
  placeholder: {
    children: Array<{
      type: string;
      props: Record<string, any>;
    }>;
  };
  templates: {
    render: string;
    content: string;
  };
  fields: Record<string, {
    type: "checkbox" | "select" | "text" | "content-items";
    label: string;
    description?: string;
    options?: Record<string, any>;
    enable?: string;
    attrs?: Record<string, any>;
  }>;
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
  static convertWebsiteToJoomla(data: WebsiteData): any {
    const { html } = data;
    const elements = this.parseHtmlToYOOthemeElements(html);
    
    // Convert elements to YOOtheme sections format
    const sections = elements.map((element, index) => ({
      "type": "section",
      "name": `section_${index + 1}`,
      "props": {
        "style": "default",
        "padding": "default",
        "margin": "default"
      },
      "children": [{
        "type": element.name,
        "name": element.name,
        "props": element.defaults,
        "children": element.placeholder.children
      }]
    }));
    
    // Return YOOtheme Page Builder compatible structure
    return {
      "type": "layout",
      "children": sections
    };
  }

  private static parseHtmlToYOOthemeElements(html: string): YOOthemePageBuilderElement[] {
    const elements: YOOthemePageBuilderElement[] = [];
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Header/Navigation Element
    const headerElements = doc.querySelectorAll('header, nav, .header, .navbar, .nav-menu, [role="banner"]');
    if (headerElements.length > 0) {
      elements.push(this.createNavigationElement(headerElements[0]));
    }

    // Main content sections
    const contentSections = this.identifyContentSections(doc);
    contentSections.forEach((section, index) => {
      const element = this.createContentElement(section, index);
      if (element) {
        elements.push(element);
      }
    });

    // Footer Element
    const footerElements = doc.querySelectorAll('footer, .footer, [role="contentinfo"]');
    if (footerElements.length > 0) {
      elements.push(this.createFooterElement(footerElements[0]));
    }

    return elements;
  }

  private static identifyContentSections(doc: Document): Element[] {
    const sections: Element[] = [];
    
    // Primary content selectors
    const contentSelectors = [
      'main section',
      'main article', 
      'main .section',
      'main .container > div',
      'section',
      'article',
      '.hero',
      '.banner',
      '.content-section',
      '.page-section'
    ];

    contentSelectors.forEach(selector => {
      const elements = doc.querySelectorAll(selector);
      elements.forEach(el => {
        if (this.hasSignificantContent(el) && !this.isAlreadyIncluded(el, sections)) {
          sections.push(el);
        }
      });
    });

    // If no sections found, try broader approach
    if (sections.length === 0) {
      const mainContent = doc.querySelector('main') || doc.querySelector('body');
      if (mainContent) {
        const childSections = Array.from(mainContent.children).filter(child => 
          this.hasSignificantContent(child)
        );
        sections.push(...childSections);
      }
    }

    return sections;
  }

  private static hasSignificantContent(element: Element): boolean {
    const text = element.textContent?.trim() || '';
    const hasImages = element.querySelectorAll('img').length > 0;
    const hasMedia = element.querySelectorAll('video, audio, iframe').length > 0;
    const hasForm = element.querySelectorAll('form, input, textarea').length > 0;
    
    return text.length > 30 || hasImages || hasMedia || hasForm;
  }

  private static isAlreadyIncluded(element: Element, sections: Element[]): boolean {
    return sections.some(section => 
      section.contains(element) || element.contains(section)
    );
  }

  private static createNavigationElement(headerEl: Element): YOOthemePageBuilderElement {
    const navLinks = Array.from(headerEl.querySelectorAll('a')).map(link => ({
      text: link.textContent?.trim() || '',
      url: link.getAttribute('href') || '#'
    }));

    return {
      name: "site_navigation",
      title: "Site Navigation",
      group: "layout",
      icon: "${url:images/navigation.svg}",
      iconSmall: "${url:images/navigation-small.svg}",
      element: true,
      container: true,
      width: 500,
      defaults: {
        show_logo: true,
        navigation_style: "navbar",
        alignment: "left"
      },
      placeholder: {
        children: [
          {
            type: "navbar",
            props: {
              logo: true,
              navigation: navLinks
            }
          }
        ]
      },
      templates: {
        render: "./templates/navigation.php",
        content: "./templates/navigation-content.php"
      },
      fields: {
        show_logo: {
          type: "checkbox",
          label: "Show Logo",
          description: "Display site logo in navigation"
        },
        navigation_style: {
          type: "select",
          label: "Navigation Style",
          options: {
            "Navbar": "navbar",
            "Tab": "tab",
            "Pill": "pill"
          }
        },
        alignment: {
          type: "select",
          label: "Alignment",
          options: {
            "Left": "left",
            "Center": "center",
            "Right": "right"
          }
        }
      }
    };
  }

  private static createContentElement(section: Element, index: number): YOOthemePageBuilderElement | null {
    const contentAnalysis = this.analyzeSection(section);
    
    if (contentAnalysis.type === 'hero') {
      return this.createHeroElement(section, contentAnalysis);
    } else if (contentAnalysis.type === 'gallery') {
      return this.createGalleryElement(section, contentAnalysis);
    } else if (contentAnalysis.type === 'form') {
      return this.createFormElement(section, contentAnalysis);
    } else if (contentAnalysis.type === 'columns') {
      return this.createColumnsElement(section, contentAnalysis);
    } else {
      return this.createGenericContentElement(section, contentAnalysis, index);
    }
  }

  private static analyzeSection(section: Element): any {
    const analysis = {
      type: 'content',
      hasHeading: false,
      hasImages: false,
      hasForm: false,
      hasColumns: false,
      isHero: false,
      content: {
        headings: [],
        text: [],
        images: [],
        buttons: []
      }
    };

    // Check for hero characteristics
    const className = section.className.toLowerCase();
    const isHero = className.includes('hero') || className.includes('banner') || 
                   className.includes('jumbotron') || section.querySelector('h1');
    
    if (isHero) {
      analysis.type = 'hero';
      analysis.isHero = true;
    }

    // Extract content
    const headings = section.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(h => {
      analysis.content.headings.push({
        text: h.textContent?.trim() || '',
        level: parseInt(h.tagName.substring(1))
      });
    });

    const paragraphs = section.querySelectorAll('p, div');
    paragraphs.forEach(p => {
      const text = p.textContent?.trim() || '';
      if (text.length > 20 && !p.querySelector('img, button, a')) {
        analysis.content.text.push(text);
      }
    });

    const images = section.querySelectorAll('img');
    images.forEach(img => {
      analysis.content.images.push({
        src: img.getAttribute('src') || '',
        alt: img.getAttribute('alt') || ''
      });
    });

    const buttons = section.querySelectorAll('button, a[class*="btn"], .button');
    buttons.forEach(btn => {
      analysis.content.buttons.push({
        text: btn.textContent?.trim() || '',
        href: btn.getAttribute('href') || '#'
      });
    });

    // Check for multiple images (gallery)
    if (images.length > 3) {
      analysis.type = 'gallery';
    }

    // Check for forms
    if (section.querySelector('form')) {
      analysis.type = 'form';
    }

    // Check for columns
    const potentialColumns = section.querySelectorAll('.col, [class*="col-"], .column, [class*="grid-"]');
    if (potentialColumns.length > 1) {
      analysis.type = 'columns';
      analysis.hasColumns = true;
    }

    return analysis;
  }

  private static createHeroElement(section: Element, analysis: any): YOOthemePageBuilderElement {
    const mainHeading = analysis.content.headings[0]?.text || 'Hero Section';
    const mainText = analysis.content.text[0] || '';
    const primaryButton = analysis.content.buttons[0];

    return {
      name: "hero_section",
      title: "Hero Section",
      group: "layout",
      icon: "${url:images/hero.svg}",
      iconSmall: "${url:images/hero-small.svg}",
      element: true,
      container: true,
      width: 500,
      defaults: {
        show_image: analysis.content.images.length > 0,
        content_width: "1-2",
        text_align: "left",
        overlay: false
      },
      placeholder: {
        children: [
          {
            type: "heading",
            props: {
              content: mainHeading,
              tag: "h1"
            }
          },
          {
            type: "text",
            props: {
              content: mainText
            }
          }
        ]
      },
      templates: {
        render: "./templates/hero.php",
        content: "./templates/hero-content.php"
      },
      fields: {
        hero_title: {
          type: "text",
          label: "Hero Title",
          attrs: {
            placeholder: mainHeading
          }
        },
        hero_content: {
          type: "text",
          label: "Hero Content",
          attrs: {
            placeholder: mainText
          }
        },
        button_text: {
          type: "text",
          label: "Button Text",
          attrs: {
            placeholder: primaryButton?.text || "Learn More"
          }
        },
        button_link: {
          type: "text",
          label: "Button Link",
          attrs: {
            placeholder: primaryButton?.href || "#"
          }
        },
        show_image: {
          type: "checkbox",
          label: "Show Background Image"
        },
        content_width: {
          type: "select",
          label: "Content Width",
          options: {
            "1/2": "1-2",
            "2/3": "2-3", 
            "3/4": "3-4",
            "Full": "1-1"
          }
        }
      }
    };
  }

  private static createGalleryElement(section: Element, analysis: any): YOOthemePageBuilderElement {
    return {
      name: "image_gallery",
      title: "Image Gallery",
      group: "media",
      icon: "${url:images/gallery.svg}",
      iconSmall: "${url:images/gallery-small.svg}",
      element: true,
      container: true,
      width: 500,
      defaults: {
        columns: 3,
        gap: "default",
        lightbox: true
      },
      placeholder: {
        children: analysis.content.images.map((img: any) => ({
          type: "image",
          props: {
            src: img.src,
            alt: img.alt
          }
        }))
      },
      templates: {
        render: "./templates/gallery.php",
        content: "./templates/gallery-content.php"
      },
      fields: {
        gallery_items: {
          type: "content-items",
          label: "Gallery Images"
        },
        columns: {
          type: "select",
          label: "Columns",
          options: {
            "2": 2,
            "3": 3,
            "4": 4,
            "5": 5
          }
        },
        gap: {
          type: "select",
          label: "Gap",
          options: {
            "Small": "small",
            "Default": "default",
            "Medium": "medium",
            "Large": "large"
          }
        },
        lightbox: {
          type: "checkbox",
          label: "Enable Lightbox"
        }
      }
    };
  }

  private static createFormElement(section: Element, analysis: any): YOOthemePageBuilderElement {
    const form = section.querySelector('form');
    const inputs = form ? Array.from(form.querySelectorAll('input, textarea, select')) : [];

    return {
      name: "contact_form",
      title: "Contact Form",
      group: "multiple items",
      icon: "${url:images/form.svg}",
      iconSmall: "${url:images/form-small.svg}",
      element: true,
      container: true,
      width: 500,
      defaults: {
        form_style: "default",
        submit_text: "Submit"
      },
      placeholder: {
        children: inputs.map(input => ({
          type: "form_field",
          props: {
            type: input.getAttribute('type') || 'text',
            name: input.getAttribute('name') || '',
            placeholder: input.getAttribute('placeholder') || ''
          }
        }))
      },
      templates: {
        render: "./templates/form.php",
        content: "./templates/form-content.php"
      },
      fields: {
        form_fields: {
          type: "content-items",
          label: "Form Fields"
        },
        form_style: {
          type: "select",
          label: "Form Style",
          options: {
            "Default": "default",
            "Stacked": "stacked",
            "Horizontal": "horizontal"
          }
        },
        submit_text: {
          type: "text",
          label: "Submit Button Text",
          attrs: {
            placeholder: "Submit"
          }
        }
      }
    };
  }

  private static createColumnsElement(section: Element, analysis: any): YOOthemePageBuilderElement {
    const columns = section.querySelectorAll('.col, [class*="col-"], .column, [class*="grid-"]');
    
    return {
      name: "content_columns",
      title: "Content Columns",
      group: "layout",
      icon: "${url:images/columns.svg}",
      iconSmall: "${url:images/columns-small.svg}",
      element: true,
      container: true,
      width: 500,
      defaults: {
        columns_count: Math.min(columns.length, 4),
        gap: "default",
        vertical_align: "top"
      },
      placeholder: {
        children: Array.from(columns).slice(0, 4).map(col => ({
          type: "column",
          props: {
            content: col.textContent?.trim().substring(0, 100) || ''
          }
        }))
      },
      templates: {
        render: "./templates/columns.php",
        content: "./templates/columns-content.php"
      },
      fields: {
        column_items: {
          type: "content-items",
          label: "Column Content"
        },
        columns_count: {
          type: "select",
          label: "Number of Columns",
          options: {
            "2": 2,
            "3": 3,
            "4": 4
          }
        },
        gap: {
          type: "select",
          label: "Column Gap",
          options: {
            "Small": "small",
            "Default": "default", 
            "Medium": "medium",
            "Large": "large"
          }
        },
        vertical_align: {
          type: "select",
          label: "Vertical Alignment",
          options: {
            "Top": "top",
            "Middle": "middle",
            "Bottom": "bottom"
          }
        }
      }
    };
  }

  private static createGenericContentElement(section: Element, analysis: any, index: number): YOOthemePageBuilderElement {
    const title = analysis.content.headings[0]?.text || `Content Section ${index + 1}`;
    
    return {
      name: `content_section_${index}`,
      title: title,
      group: "layout",
      icon: "${url:images/content.svg}",
      iconSmall: "${url:images/content-small.svg}",
      element: true,
      container: true,
      width: 500,
      defaults: {
        show_title: analysis.content.headings.length > 0,
        content_style: "default"
      },
      placeholder: {
        children: [
          ...analysis.content.headings.map((heading: any) => ({
            type: "heading",
            props: {
              content: heading.text,
              tag: `h${heading.level}`
            }
          })),
          ...analysis.content.text.map((text: string) => ({
            type: "text",
            props: {
              content: text.substring(0, 200)
            }
          })),
          ...analysis.content.images.map((img: any) => ({
            type: "image",
            props: {
              src: img.src,
              alt: img.alt
            }
          })),
          ...analysis.content.buttons.map((btn: any) => ({
            type: "button",
            props: {
              content: btn.text,
              link: btn.href
            }
          }))
        ]
      },
      templates: {
        render: "./templates/content-section.php",
        content: "./templates/content-section-content.php"
      },
      fields: {
        section_title: {
          type: "text",
          label: "Section Title",
          attrs: {
            placeholder: title
          }
        },
        section_content: {
          type: "text",
          label: "Section Content"
        },
        content_style: {
          type: "select",
          label: "Content Style",
          options: {
            "Default": "default",
            "Card": "card",
            "Panel": "panel"
          }
        },
        show_title: {
          type: "checkbox",
          label: "Show Section Title"
        }
      }
    };
  }

  private static createFooterElement(footerEl: Element): YOOthemePageBuilderElement {
    const footerText = footerEl.textContent?.trim() || '';
    const footerLinks = Array.from(footerEl.querySelectorAll('a')).map(link => ({
      text: link.textContent?.trim() || '',
      url: link.getAttribute('href') || '#'
    }));

    return {
      name: "site_footer",
      title: "Site Footer",
      group: "layout",
      icon: "${url:images/footer.svg}",
      iconSmall: "${url:images/footer-small.svg}",
      element: true,
      container: true,
      width: 500,
      defaults: {
        footer_style: "default",
        show_copyright: true
      },
      placeholder: {
        children: [
          {
            type: "footer_content",
            props: {
              content: footerText.substring(0, 200),
              links: footerLinks
            }
          }
        ]
      },
      templates: {
        render: "./templates/footer.php",
        content: "./templates/footer-content.php"
      },
      fields: {
        footer_content: {
          type: "text",
          label: "Footer Content",
          attrs: {
            placeholder: footerText.substring(0, 100)
          }
        },
        footer_style: {
          type: "select",
          label: "Footer Style",
          options: {
            "Default": "default",
            "Minimal": "minimal",
            "Extended": "extended"
          }
        },
        show_copyright: {
          type: "checkbox",
          label: "Show Copyright"
        }
      }
    };
  }
}