// Auto-generated TypeScript definitions for EbitenStudio UI
// DO NOT EDIT MANUALLY
// Generated at: 2025-12-26 12:00:00

// ============ Base Types ============

interface RGBA {
    r: number;
    g: number;
    b: number;
    a: number;
}

interface Rectangle {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Base interface for all UI widgets
 */
interface UIWidget {
    readonly id: string;
    readonly type: string;

    // Tree navigation
    getChildren(): UIWidget[];
    getParent(): UIWidget | null;
    findDescendant(id: string): UIWidget | null;

    // Layout methods
    setX(x: number): void;
    setY(y: number): void;
    setWidth(width: number): void;
    setHeight(height: number): void;
    setBounds(x: number, y: number, width: number, height: number): void;
    getBounds(): Rectangle;

    // Visibility
    setVisible(visible: boolean): void;
    isVisible(): boolean;

    // Z-Index
    setZIndex(z: number): void;
    getZIndex(): number;

    // Interaction
    setInteractive(interactive: boolean): void;
    isInteractive(): boolean;
}

// ============ Event Types ============

/**
 * Base event interface
 */
interface BaseEvent {
    type: string;
    target: UIWidget;
    timestamp: number;
    data?: Record<string, any>;
}

/**
 * Mouse event interface
 */
interface MouseEvent extends BaseEvent {
    x: number;
    y: number;
    button: number;
}

/**
 * Button click event
 */
interface ButtonClickEvent extends MouseEvent {
    type: 'click';
    target: UIButton;
}

/**
 * Text change event
 */
interface TextChangeEvent extends BaseEvent {
    type: 'change';
    target: UITextInput;
}

/**
 * Keyboard event
 */
interface KeyEvent extends BaseEvent {
    key: string;
    keyCode: number;
}

/**
 * Hover event
 */
interface HoverEvent extends MouseEvent {
    type: 'hover';
}

// ============ Widget Types ============

/**
 * button widget
 */
interface UIButton extends UIWidget {
    setText(text: string): void;
    getText(): string;
    setEnabled(enabled: boolean): void;
    isEnabled(): boolean;
    click(): void;
}

/**
 * label widget
 */
interface UILabel extends UIWidget {
    setText(text: string): void;
    getText(): string;
    setColor(r: number, g: number, b: number, a: number): void;
    getColor(): RGBA;
    setFontSize(size: number): void;
    getFontSize(): number;
}

/**
 * textinput widget
 */
interface UITextInput extends UIWidget {
    setText(text: string): void;
    getText(): string;
    setPlaceholder(text: string): void;
    getPlaceholder(): string;
    focus(): void;
    blur(): void;
    selectAll(): void;
    isFocused(): boolean;
}

/**
 * panel widget
 */
interface UIPanel extends UIWidget {
    addChild(widget: UIWidget): void;
    removeChild(id: string): void;
    clear(): void;
    getChildCount(): number;
}

/**
 * image widget
 */
interface UIImage extends UIWidget {
    setImage(path: string): void;
    getImagePath(): string;
    setScale(scale: number): void;
    getScale(): number;
}

/**
 * checkbox widget
 */
interface UICheckBox extends UIWidget {
    setChecked(checked: boolean): void;
    isChecked(): boolean;
    setLabel(text: string): void;
    getLabel(): string;
}

/**
 * radiobutton widget
 */
interface UIRadioButton extends UIWidget {
    setSelected(selected: boolean): void;
    isSelected(): boolean;
    setLabel(text: string): void;
    getLabel(): string;
    setGroup(group: string): void;
    getGroup(): string;
}

/**
 * slider widget
 */
interface UISlider extends UIWidget {
    setValue(value: number): void;
    getValue(): number;
    setMin(min: number): void;
    getMin(): number;
    setMax(max: number): void;
    getMax(): number;
    setStep(step: number): void;
    getStep(): number;
}

/**
 * combobox widget
 */
interface UIComboBox extends UIWidget {
    addItem(text: string, value: any): void;
    removeItem(index: number): void;
    clearItems(): void;
    setSelectedIndex(index: number): void;
    getSelectedIndex(): number;
    getSelectedValue(): any;
}

/**
 * tableview widget
 */
interface UITableView extends UIWidget {
    setColumns(columns: string[]): void;
    addRow(row: any[]): void;
    removeRow(index: number): void;
    clearRows(): void;
    getRowCount(): number;
    getSelectedRow(): number;
}

/**
 * listview widget
 */
interface UIListView extends UIWidget {
    addItem(text: string): void;
    removeItem(index: number): void;
    clearItems(): void;
    setSelectedIndex(index: number): void;
    getSelectedIndex(): number;
    getItemCount(): number;
}

/**
 * gridview widget
 */
interface UIGridView extends UIWidget {
    setColumns(columns: number): void;
    getColumns(): number;
    addItem(widget: UIWidget): void;
    removeItem(index: number): void;
    clearItems(): void;
    getItemCount(): number;
}

// ============ Global APIs ============

/**
 * Console API for logging
 */
interface Console {
    log(...args: any[]): void;
    error(...args: any[]): void;
    warn(...args: any[]): void;
    info(...args: any[]): void;
}

declare const console: Console;

/**
 * Global API for timers and utilities
 */
interface Global {
    setTimeout(callback: () => void, delay: number): number;
    clearTimeout(id: number): void;
    setInterval(callback: () => void, interval: number): number;
    clearInterval(id: number): void;
}

declare const Global: Global;

// ============ RootElement ============

interface LoginPanel extends UIPanel {
    resetButton: UIButton;
    usernameLabel: UILabel;
    passwordLabel: UILabel;
    loginButton: UIButton;
    passwordInput: UITextInput;
    rememberCheckbox: UICheckBox;
    usernameInput: UITextInput;
}

interface MainPanel extends UIPanel {
    loginPanel: LoginPanel;
}

/**
 * Root element for accessing UI widgets
 */
interface RootElement {
    getElementById(id: string): UIWidget | null;
    getByType(type: string): UIWidget[];

    passwordStrength: UILabel;
    messageLabel: UILabel;
    mainPanel: MainPanel;
}

declare const RootElement: RootElement;

