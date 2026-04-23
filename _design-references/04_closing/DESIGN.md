---
name: Chongmu PRO Elite
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#b9c8de'
  on-secondary: '#233143'
  secondary-container: '#39485a'
  on-secondary-container: '#a7b6cc'
  tertiary: '#7bd0ff'
  on-tertiary: '#00354a'
  tertiary-container: '#009bd1'
  on-tertiary-container: '#002d40'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#d4e4fa'
  secondary-fixed-dim: '#b9c8de'
  on-secondary-fixed: '#0d1c2d'
  on-secondary-fixed-variant: '#39485a'
  tertiary-fixed: '#c4e7ff'
  tertiary-fixed-dim: '#7bd0ff'
  on-tertiary-fixed: '#001e2c'
  on-tertiary-fixed-variant: '#004c69'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  data-tabular:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-padding: 32px
  gutter: 24px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The ethos of this design system is "Executive Command." It is built for high-stakes decision-making where clarity meets luxury. The aesthetic rejects the playful, rounded nature of consumer apps in favor of a precision-engineered, high-end SaaS environment.

The style combines **Minimalism** with sophisticated **Glassmorphism**. By utilizing deep, light-absorbing backgrounds contrasted with luminous, translucent layers, the UI creates a sense of physical depth and digital craftsmanship. Every interaction should feel intentional and weighted, evoking the feeling of a premium physical cockpit or an elite financial terminal.

## Colors
The palette is rooted in **Deep Midnight Navy**, serving as a cinematic, low-distraction canvas. **Electric Indigo** is used sparingly as the primary action color to draw the eye to critical paths and primary conversions. 

**Soft Slate** provides a secondary tier for metadata and non-critical UI elements, ensuring the interface doesn't feel cluttered even when data-dense. For data visualization, we introduce a Tertiary Sky Blue to provide essential contrast against the indigo. Gradients should be used as subtle "inner glows" or linear strokes rather than heavy fills.

## Typography
This design system utilizes **Inter** for its unparalleled legibility in complex data environments. To achieve the "Elite" aesthetic, we employ high contrast between weights. 

Headlines use tighter letter-spacing and heavier weights to command authority. Body text maintains a generous line height for long-form reports. A specialized `data-tabular` style is utilized for ERP tables, ensuring numbers align perfectly and remain legible at smaller scales. Labels are often uppercase with slight tracking to differentiate them from interactive data points.

## Layout & Spacing
The layout follows a **Fluid Grid** model to accommodate the varying screen sizes of executive laptops and ultra-wide monitors. A rigorous 8px spatial system ensures mathematical harmony across all components.

We utilize a 12-column grid with generous 32px external margins to give the content "room to breathe," preventing the dense ERP data from feeling overwhelming. Use "Stack" spacing for vertical rhythm within cards, favoring a 16px (2x) or 32px (4x) gap to maintain a clean, high-end editorial feel.

## Elevation & Depth
Depth is created through **Glassmorphism** and tonal stacking rather than traditional shadows. 

1.  **Base Layer:** The darkest Deep Midnight Navy (#020617).
2.  **Card Layer:** Semi-transparent Midnight Navy (#0F172A at 60% opacity) with a 12px Backdrop Blur and a 1px border of "Soft Slate" at 10% opacity.
3.  **Active/Hover Layer:** Increased transparency and a subtle Electric Indigo outer glow (blur: 20px, spread: -5px, opacity: 0.15).

Avoid heavy drop shadows; instead, use light-colored "rim lights" (top-inner borders) to define edges against the dark background.

## Shapes
The shape language is **Rounded**, using a 0.5rem base radius. This strikes the balance between the clinical sharpness of legacy enterprise software and the overly "bubbly" feel of consumer apps. 

- **Small Components (Checkboxes, Tags):** 4px radius.
- **Standard Components (Buttons, Inputs):** 8px radius.
- **Large Containers (Cards, Modals):** 16px - 24px radius to emphasize the "glass slab" aesthetic.

## Components

### Buttons
Primary buttons use a subtle vertical gradient of Electric Indigo to a slightly darker shade, with white text. Secondary buttons are "ghost" style with a Soft Slate border and semi-transparent fill. Use a 200ms ease-in-out transition for all hover states.

### Cards
Cards are the centerpiece of this design system. They must implement `backdrop-filter: blur(12px)` and feature a thin, 1px border using a linear gradient (Top-Left: White 10%, Bottom-Right: Transparent) to simulate light hitting an edge.

### Data Tables
Tables should forgo heavy row borders. Instead, use alternating subtle tonal fills or highlight the row on hover with a semi-transparent Electric Indigo tint. Text should be high-contrast white for primary data and Soft Slate for secondary metadata.

### Input Fields
Inputs should be dark, slightly recessed with an inner shadow, and use the Electric Indigo color for the focus ring. The focus ring should have a 2px offset to maintain clarity.

### KPI Indicators
Use high-contrast typography for large numerical values. Trend lines (sparklines) should be monochromatic (Electric Indigo) with a subtle glow effect to signify vitality and performance.