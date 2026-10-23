# Aura Calc — Modern Precision Calculator Web Application

Aura Calc is a modern, visually impressive, responsive web calculator built with Vanilla HTML5, CSS3, and JavaScript. Designed with a high-end SaaS productivity aesthetic, it offers powerful arithmetic features, an embedded mathematical parsing engine, persistent history, and full keyboard accessibility.

---

## Color Palette & Aesthetic

Aura Calc uses a strict, balanced color palette:

- **Brown (`#6f4e37`)**: Used for primary action buttons, equal triggers, brand identity, and soft radial ambient glows.
- **Silver / Light Gray (`#e5e4e2`)**: Used for elevated surface borders, crisp typography, and light mode accents.
- **Soft Lavender (`#e6e0f0`)**: Used for scientific buttons, focus rings, hover indicators, and subtle glassmorphic highlights.

---

## Key Features

- **Safe Custom Math Engine**: Built on the **Shunting-Yard algorithm** and **RPN (Reverse Polish Notation)** evaluation. Evaluates complex math securely without relying on dangerous `eval()` calls.
- **Smart Error Handling**: Gracefully intercepts syntax errors, unbalanced parentheses, and division by zero with friendly feedback (`Cannot divide by zero`, `Invalid calculation`) without breaking application execution.
- **Two-Level Dynamic Display**: Real-time expression preview and result updating with smart number formatting (comma separators & scientific notation for large numbers).
- **Advanced Operations**:
  - Basic: Addition (`+`), Subtraction (`−`), Multiplication (`×`), Division (`÷`)
  - Advanced: Square root (`√`), Square (`x²`), Reciprocal (`1/x`), Percentage (`%`), Sign Toggle (`±`), Brackets (`( )`)
  - Memory: `MC`, `MR`, `M+`, `M-`
- **Calculation History**: Stores recent calculations persistently in `localStorage`. Reuse previous results by clicking on any item. Delete individual entries or clear all.
- **Keyboard Navigation**: Full keyboard bindings for all numeric and operational keys.
- **Light / Dark Mode**: Theme switch persistence using CSS custom properties.
- **Clipboard Integration**: One-click copy result button with toast notifications.
- **Fully Responsive**: Designed for mobile, tablet, and desktop viewports with responsive font sizes (`clamp`) and a collapsible mobile history drawer.

---

## File Structure

calculator/
├── index.html # Semantic HTML5 layout and accessibility markup
├── style.css # CSS3 custom properties, glassmorphic layout, and responsive styles
├── script.js # Custom Shunting-Yard math evaluator and DOM interactivity
└── README.md # Documentation and overview

---

## Keyboard Shortcuts

| Key                | Action                 |
| :----------------- | :--------------------- |
| `0` - `9`          | Digit input            |
| `.`                | Decimal point          |
| `+`, `-`, `*`, `/` | Basic operators        |
| `%`                | Percentage             |
| `(` / `)`          | Parentheses            |
| `Enter` / `=`      | Calculate result       |
| `Backspace`        | Delete last character  |
| `Escape`           | Clear calculation (AC) |

---

## 🛠️ Technical Implementation Highlights

1. **Math Precision**: Eliminates floating-point anomalies (e.g., `0.1 + 0.2` outputs `0.3` instead of `0.30000000000000004`).
2. **Accessibility**: Includes `aria-live` regions for screen readers, high contrast buttons, and keyboard navigation.
3. **Zero Dependencies**: Pure HTML, CSS, and Vanilla JavaScript—lightweight and high performance.
