// EbitenStudio 脚本系统类型定义
// 为所有控件事件和API提供TypeScript类型支持

// ========== 全局API ==========

/**
 * 控件基类（所有UI控件的基础）
 */
interface UIWidget {
    /** 设置可见性 */
    setVisible(visible: boolean): void;
    /** 设置启用状态 */
    setEnabled(enabled: boolean): void;
    /** 设置位置 */
    setPosition(x: number, y: number): void;
    /** 设置大小 */
    setSize(width: number, height: number): void;
    /** 设置颜色 (RGBA 0-255) */
    setColor(r: number, g: number, b: number, a: number): void;
    /** 获取控件ID */
    getID(): string;
    /** 获取控件类型 */
    getType(): string;
}

/**
 * 按钮控件
 */
interface UIButton extends UIWidget {
    /** 设置按钮文本 */
    setText(text: string): void;
    /** 获取按钮文本 */
    getText(): string;
    /** 设置字体大小 */
    setFontSize(size: number): void;
}

/**
 * 文本输入框
 */
interface UITextInput extends UIWidget {
    /** 设置文本内容 */
    setText(text: string): void;
    /** 获取文本内容 */
    getText(): string;
    /** 设置占位符 */
    setPlaceholder(text: string): void;
    /** 设置最大长度 */
    setMaxLength(length: number): void;
    /** 设置输入模式 (text/password/number/email) */
    setInputMode(mode: 'text' | 'password' | 'number' | 'email'): void;
    /** 设置焦点 */
    setFocus(): void;
    /** 清除焦点 */
    blur(): void;
}

/**
 * 文本标签
 */
interface UILabel extends UIWidget {
    /** 设置文本 */
    setText(text: string): void;
    /** 获取文本 */
    getText(): string;
    /** 设置字体大小 */
    setFontSize(size: number): void;
    /** 设置文本对齐 (left/center/right) */
    setAlign(align: 'left' | 'center' | 'right'): void;
}

/**
 * 面板容器
 */
interface UIPanel extends UIWidget {
    /** 设置背景颜色 */
    setBackgroundColor(r: number, g: number, b: number, a: number): void;
    /** 设置边框宽度 */
    setBorderWidth(width: number): void;
}

/**
 * 图片控件
 */
interface UIImage extends UIWidget {
    /** 设置图片资源ID */
    setImageID(resourceID: string): void;
    /** 设置缩放模式 (fit/fill/stretch) */
    setScaleMode(mode: 'fit' | 'fill' | 'stretch'): void;
}

/**
 * 复选框
 */
interface UICheckBox extends UIWidget {
    /** 设置选中状态 */
    setChecked(checked: boolean): void;
    /** 获取选中状态 */
    getChecked(): boolean;
    /** 设置标签文本 */
    setLabel(text: string): void;
}

/**
 * 滑动条
 */
interface UISlider extends UIWidget {
    /** 设置当前值 */
    setValue(value: number): void;
    /** 获取当前值 */
    getValue(): number;
    /** 设置最小值 */
    setMin(min: number): void;
    /** 设置最大值 */
    setMax(max: number): void;
    /** 设置步进值 */
    setStep(step: number): void;
}

// ========== 事件参数类型 ==========

/**
 * 按钮点击事件
 */
interface ButtonClickEvent {
    /** 事件类型 */
    type: 'click';
    /** 触发事件的按钮控件（与self参数相同） */
    target: UIButton;
    /** 鼠标X坐标（相对于控件） */
    mouseX: number;
    /** 鼠标Y坐标（相对于控件） */
    mouseY: number;
    /** 是否按下Ctrl键 */
    ctrlKey: boolean;
    /** 是否按下Shift键 */
    shiftKey: boolean;
    /** 是否按下Alt键 */
    altKey: boolean;
    /** 点击次数（单击/双击） */
    clickCount: number;
}

/**
 * 鼠标悬停事件
 */
interface MouseHoverEvent {
    /** 事件类型 */
    type: 'hover';
    /** 触发事件的控件 */
    target: UIWidget;
    /** 鼠标X坐标 */
    mouseX: number;
    /** 鼠标Y坐标 */
    mouseY: number;
    /** 是否刚进入控件区域 */
    isEnter: boolean;
}

/**
 * 鼠标按下事件
 */
interface MouseDownEvent {
    /** 事件类型 */
    type: 'mousedown';
    /** 触发事件的控件 */
    target: UIWidget;
    /** 鼠标按钮 (0=左键, 1=中键, 2=右键) */
    button: 0 | 1 | 2;
    /** 鼠标X坐标 */
    mouseX: number;
    /** 鼠标Y坐标 */
    mouseY: number;
}

/**
 * 鼠标释放事件
 */
interface MouseUpEvent {
    /** 事件类型 */
    type: 'mouseup';
    /** 触发事件的控件 */
    target: UIWidget;
    /** 鼠标按钮 */
    button: 0 | 1 | 2;
    /** 鼠标X坐标 */
    mouseX: number;
    /** 鼠标Y坐标 */
    mouseY: number;
}

/**
 * 文本改变事件
 */
interface TextInputChangeEvent {
    /** 事件类型 */
    type: 'change';
    /** 触发事件的输入框控件 */
    target: UITextInput;
    /** 当前文本内容 */
    text: string;
    /** 修改前的文本 */
    oldText: string;
    /** 是否通过用户输入触发（非代码设置） */
    isUserInput: boolean;
}

/**
 * 焦点获得事件
 */
interface FocusEvent {
    /** 事件类型 */
    type: 'focus';
    /** 触发事件的控件 */
    target: UIWidget;
    /** 控件ID */
    targetID: string;
}

/**
 * 焦点失去事件
 */
interface BlurEvent {
    /** 事件类型 */
    type: 'blur';
    /** 触发事件的控件 */
    target: UIWidget;
    /** 控件ID */
    targetID: string;
    /** 当前文本内容（对于文本输入框） */
    text?: string;
}

/**
 * 提交事件（Enter键）
 */
interface SubmitEvent {
    /** 事件类型 */
    type: 'submit';
    /** 触发事件的输入框控件 */
    target: UITextInput;
    /** 提交的文本内容 */
    text: string;
}

/**
 * 按键事件
 */
interface KeyPressEvent {
    /** 事件类型 */
    type: 'keypress';
    /** 触发事件的控件 */
    target: UIWidget;
    /** 按键名称 (Enter, Escape, Tab, etc.) */
    key: string;
    /** 按键代码 */
    keyCode: number;
    /** 是否按下Ctrl */
    ctrlKey: boolean;
    /** 是否按下Shift */
    shiftKey: boolean;
    /** 是否按下Alt */
    altKey: boolean;
}

/**
 * CheckBox状态改变事件
 */
interface CheckBoxChangeEvent {
    /** 事件类型 */
    type: 'change';
    /** 触发事件的复选框控件 */
    target: UICheckBox;
    /** 当前选中状态 */
    checked: boolean;
    /** 之前的状态 */
    oldChecked: boolean;
}

/**
 * Slider值改变事件
 */
interface SliderChangeEvent {
    /** 事件类型 */
    type: 'change';
    /** 触发事件的滑动条控件 */
    target: UISlider;
    /** 当前值 */
    value: number;
    /** 之前的值 */
    oldValue: number;
    /** 是否正在拖动中 */
    isDragging: boolean;
}

// ========== 事件处理器类型 ==========

/**
 * 按钮事件处理器集合
 */
interface ButtonEventHandlers {
    onClick?: (self: UIButton, event: ButtonClickEvent) => void;
    onHover?: (self: UIButton, event: MouseHoverEvent) => void;
    onMouseDown?: (self: UIButton, event: MouseDownEvent) => void;
    onMouseUp?: (self: UIButton, event: MouseUpEvent) => void;
}

/**
 * 文本输入框事件处理器集合
 */
interface TextInputEventHandlers {
    onChange?: (self: UITextInput, event: TextInputChangeEvent) => void;
    onFocus?: (self: UITextInput, event: FocusEvent) => void;
    onBlur?: (self: UITextInput, event: BlurEvent) => void;
    onSubmit?: (self: UITextInput, event: SubmitEvent) => void;
    onKeyPress?: (self: UITextInput, event: KeyPressEvent) => void;
}

/**
 * CheckBox事件处理器集合
 */
interface CheckBoxEventHandlers {
    onChange?: (self: UICheckBox, event: CheckBoxChangeEvent) => void;
    onClick?: (self: UICheckBox, event: ButtonClickEvent) => void;
}

/**
 * Slider事件处理器集合
 */
interface SliderEventHandlers {
    onChange?: (self: UISlider, event: SliderChangeEvent) => void;
    onDragStart?: (self: UISlider, event: MouseDownEvent) => void;
    onDragEnd?: (self: UISlider, event: MouseUpEvent) => void;
}

// ========== 全局对象 ==========

/**
 * 全局状态存储（跨脚本共享数据）
 */
declare const Global: {
    [key: string]: any;
};

/**
 * UI树根节点（自动生成，参考 ui_example.d.ts）
 */
declare const RootElement: any; // 具体类型由项目的 .d.ts 文件定义

/**
 * 控制台日志
 */
declare const console: {
    log(...args: any[]): void;
    warn(...args: any[]): void;
    error(...args: any[]): void;
};

/**
 * 定时器函数
 */
declare function setTimeout(callback: () => void, delay: number): number;
declare function setInterval(callback: () => void, delay: number): number;
declare function clearTimeout(id: number): void;
declare function clearInterval(id: number): void;

/**
 * 模块加载（CommonJS风格）
 */
declare function require(moduleName: string): any;

// ========== 便捷方法（可选，通过self参数更直观） ==========

/**
 * 当前脚本绑定的控件快捷方法
 * 注意：推荐直接使用 self 参数，这些全局方法仅为向后兼容
 */
declare const setVisible: UIWidget['setVisible'];
declare const setEnabled: UIWidget['setEnabled'];
declare const setPosition: UIWidget['setPosition'];
declare const setSize: UIWidget['setSize'];
declare const setColor: UIWidget['setColor'];
declare const getID: UIWidget['getID'];
declare const getType: UIWidget['getType'];

// 按钮专用（仅在Button脚本中可用）
declare const setText: UIButton['setText'];
declare const getText: UIButton['getText'];
declare const setFontSize: UIButton['setFontSize'];

// 文本输入框专用（仅在TextInput脚本中可用）
// declare const setText: UITextInput['setText'];
// declare const getText: UITextInput['getText'];
// declare const setPlaceholder: UITextInput['setPlaceholder'];
// declare const setMaxLength: UITextInput['setMaxLength'];
// declare const setInputMode: UITextInput['setInputMode'];
// declare const setFocus: UITextInput['setFocus'];
// declare const blur: UITextInput['blur'];
