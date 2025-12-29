package ui

// ScriptInfo 脚本信息
type ScriptInfo struct {
	FilePath string // 脚本文件路径（TypeScript源文件）
	JSCode   string // 编译后的JavaScript代码
	Loaded   bool   // 是否已加载
}

// WidgetScriptBinding 控件脚本绑定
type WidgetScriptBinding struct {
	WidgetID   string               // 控件ID
	ScriptPath string               // 脚本路径
	Handlers   map[EventType]string // 事件类型 -> 处理函数名
	WidgetType WidgetType           // 控件类型
}

// ScriptEngineConfig 脚本引擎配置
type ScriptEngineConfig struct {
	EnableConsole bool // 是否启用console.log
	MaxStackSize  int  // 最大调用栈大小（goja参数）
}

// DefaultScriptEngineConfig 默认配置
func DefaultScriptEngineConfig() ScriptEngineConfig {
	return ScriptEngineConfig{
		EnableConsole: true,
		MaxStackSize:  10000,
	}
}
