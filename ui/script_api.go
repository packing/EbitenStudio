package ui

import (
	"fmt"
	"log"

	"github.com/dop251/goja"
)

// setupCommonJSModule 注入 CommonJS 模块支持（exports 和 module.exports）
func setupCommonJSModule(vm *goja.Runtime) {
	// 创建 module 对象
	moduleObj := vm.NewObject()
	exportsObj := vm.NewObject()

	// 设置 module.exports
	moduleObj.Set("exports", exportsObj)

	// 注入到全局
	vm.Set("module", moduleObj)
	vm.Set("exports", exportsObj)
}

// setupConsole 注入console对象
func setupConsole(vm *goja.Runtime) {
	console := vm.NewObject()

	console.Set("log", func(call goja.FunctionCall) goja.Value {
		args := make([]interface{}, len(call.Arguments))
		for i, arg := range call.Arguments {
			args[i] = arg.Export()
		}
		fmt.Println(args...)
		return goja.Undefined()
	})

	console.Set("error", func(call goja.FunctionCall) goja.Value {
		args := make([]interface{}, len(call.Arguments))
		for i, arg := range call.Arguments {
			args[i] = arg.Export()
		}
		fmt.Printf("[ERROR] %v\n", args)
		return goja.Undefined()
	})

	console.Set("warn", func(call goja.FunctionCall) goja.Value {
		args := make([]interface{}, len(call.Arguments))
		for i, arg := range call.Arguments {
			args[i] = arg.Export()
		}
		fmt.Printf("[WARN] %v\n", args)
		return goja.Undefined()
	})

	console.Set("info", func(call goja.FunctionCall) goja.Value {
		args := make([]interface{}, len(call.Arguments))
		for i, arg := range call.Arguments {
			args[i] = arg.Export()
		}
		fmt.Printf("[INFO] %v\n", args)
		return goja.Undefined()
	})

	vm.Set("console", console)
}

// CommandBuilder 命令构造器（在脚本中使用）
type CommandBuilder struct {
	queue    *CommandQueue
	widgetID string
}

// newCommandBuilder 创建命令构造器
func newCommandBuilder(queue *CommandQueue, widgetID string) *CommandBuilder {
	return &CommandBuilder{
		queue:    queue,
		widgetID: widgetID,
	}
}

// setText 设置文本命令
func (cb *CommandBuilder) setText(text string) {
	log.Printf("[CommandBuilder] setText called: widgetID=%s, text=%s", cb.widgetID, text)
	cb.queue.Push(WidgetCommand{
		Type:     CommandSetText,
		WidgetID: cb.widgetID,
		Value:    text,
	})
	log.Printf("[CommandBuilder] setText command pushed to queue")
}

// setVisible 设置可见性命令
func (cb *CommandBuilder) setVisible(visible bool) {
	log.Printf("[CommandBuilder] setVisible called: widgetID=%s, visible=%v", cb.widgetID, visible)
	cb.queue.Push(WidgetCommand{
		Type:     CommandSetVisible,
		WidgetID: cb.widgetID,
		Value:    visible,
	})
}

// setColor 设置颜色命令
func (cb *CommandBuilder) setColor(r, g, b, a uint8) {
	cb.queue.Push(WidgetCommand{
		Type:     CommandSetColor,
		WidgetID: cb.widgetID,
		Value:    RGBA{R: r, G: g, B: b, A: a},
	})
}

// setProperty 设置通用属性命令
func (cb *CommandBuilder) setProperty(property string, value interface{}) {
	cb.queue.Push(WidgetCommand{
		Type:     CommandSetProperty,
		WidgetID: cb.widgetID,
		Property: property,
		Value:    value,
	})
}

// createWidgetAPI 为控件创建API对象（self参数）
func (se *ScriptEngine) createWidgetAPI(widgetID string, widgetType WidgetType) *goja.Object {
	api := se.vm.NewObject()
	cb := newCommandBuilder(se.commandQueue, widgetID)

	// 通用方法
	api.Set("getID", func() string {
		return widgetID
	})

	api.Set("setText", func(text string) {
		cb.setText(text)
	})

	api.Set("setVisible", func(visible bool) {
		cb.setVisible(visible)
	})

	api.Set("setColor", func(r, g, b, a int) {
		cb.setColor(uint8(r), uint8(g), uint8(b), uint8(a))
	})

	// 控件特定方法
	switch widgetType {
	case TypeButton:
		// UIButton特定方法
		api.Set("setEnabled", func(enabled bool) {
			cb.setProperty("enabled", enabled)
		})

	case TypeTextInput:
		// UITextInput特定方法
		api.Set("getValue", func() string {
			// TODO: 需要实现查询机制
			return ""
		})

		api.Set("setValue", func(value string) {
			cb.setText(value)
		})
	}

	return api
}

// createEventObject 将WidgetEvent转换为JavaScript对象
func (se *ScriptEngine) createEventObject(event WidgetEvent, selfAPI *goja.Object) *goja.Object {
	eventObj := se.vm.NewObject()

	// 基础属性
	eventObj.Set("type", string(event.Type))
	eventObj.Set("target", selfAPI) // event.target指向self
	eventObj.Set("timestamp", event.Timestamp.UnixMilli())

	// 鼠标事件属性
	if event.Type == EventClick || event.Type == EventMouseDown || event.Type == EventMouseUp || event.Type == EventHover {
		eventObj.Set("x", event.X)
		eventObj.Set("y", event.Y)
		eventObj.Set("button", event.Button)
	}

	// 键盘事件属性
	if event.Type == EventKeyPress {
		if key, ok := event.Data["key"].(string); ok {
			eventObj.Set("key", key)
		}
		if code, ok := event.Data["code"].(int); ok {
			eventObj.Set("keyCode", code)
		}
	}

	// 附加数据
	if event.Data != nil {
		dataObj := se.vm.NewObject()
		for k, v := range event.Data {
			dataObj.Set(k, v)
		}
		eventObj.Set("data", dataObj)
	}

	return eventObj
}

// createRootElement 创建RootElement代理对象
// RootElement允许脚本通过点号访问UI树中的控件
// 例如: RootElement.loginPanel.usernameInput.setText("hello")
func (se *ScriptEngine) createRootElement() goja.Value {
	if se.uiTree == nil {
		return goja.Undefined()
	}

	// 创建根对象
	rootObj := se.vm.NewObject()

	// 添加getElementById方法
	rootObj.Set("getElementById", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return goja.Null()
		}
		id := call.Argument(0).String()
		node := se.uiTree.FindByID(id)
		if node == nil {
			return goja.Null()
		}
		return se.createWidgetProxy(node)
	})

	// 添加getByType方法 - 返回所有指定类型的控件
	rootObj.Set("getByType", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return se.vm.NewArray()
		}
		typeName := call.Argument(0).String()

		result := se.vm.NewArray()
		idx := 0
		for _, node := range se.uiTree.GetAllDescendants(se.uiTree.Root) {
			// 跳过虚拟根节点（Widget为nil）
			if node.Widget != nil && string(node.Widget.GetType()) == typeName {
				result.Set(fmt.Sprintf("%d", idx), se.createWidgetProxy(node))
				idx++
			}
		}
		return result
	})

	// 遍历根节点的子节点，为每个子节点创建属性
	if se.uiTree.Root != nil {
		// 如果根节点是虚拟根（ID为"root"且Widget为nil），遍历其子节点
		if se.uiTree.Root.ID == "root" && se.uiTree.Root.Widget == nil {
			for _, child := range se.uiTree.Root.Children {
				// 使用控件ID作为属性名
				rootObj.Set(child.ID, se.createWidgetProxy(child))
			}
		} else {
			// 否则，根节点就是实际的顶层控件，将其作为RootElement的属性
			rootObj.Set(se.uiTree.Root.ID, se.createWidgetProxy(se.uiTree.Root))
		}
	}

	return rootObj
}

// createWidgetProxy 为UITreeNode创建JavaScript代理对象
// 支持访问控件属性、方法以及子控件
func (se *ScriptEngine) createWidgetProxy(node *UITreeNode) goja.Value {
	if node == nil {
		return goja.Null()
	}

	// 创建代理对象
	proxyObj := se.vm.NewObject()

	// 添加控件ID和类型信息
	proxyObj.Set("id", node.ID)

	// 如果是虚拟根节点（Widget为nil），不设置type和API
	if node.Widget != nil {
		proxyObj.Set("type", string(node.Widget.GetType()))

		// 复制控件API方法到代理对象
		widgetAPI := se.createWidgetAPI(node.ID, node.Widget.GetType())
		se.copyObjectProperties(proxyObj, widgetAPI)
	}

	// 为每个子控件创建属性，支持点号访问
	for _, child := range node.Children {
		proxyObj.Set(child.ID, se.createWidgetProxy(child))
	}

	// 添加getChildren方法 - 返回所有直接子控件
	proxyObj.Set("getChildren", func() goja.Value {
		children := se.vm.NewArray()
		for i, child := range node.Children {
			children.Set(fmt.Sprintf("%d", i), se.createWidgetProxy(child))
		}
		return children
	})

	// 添加getParent方法
	proxyObj.Set("getParent", func() goja.Value {
		if node.Parent == nil {
			return goja.Null()
		}
		return se.createWidgetProxy(node.Parent)
	})

	// 添加findDescendant方法 - 按ID查找后代
	proxyObj.Set("findDescendant", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return goja.Null()
		}
		id := call.Argument(0).String()
		descendant := node.FindDescendant(id)
		if descendant == nil {
			return goja.Null()
		}
		return se.createWidgetProxy(descendant)
	})

	return proxyObj
}

// copyObjectProperties 复制对象属性
// 将source对象的所有属性复制到target对象
func (se *ScriptEngine) copyObjectProperties(target, source *goja.Object) {
	if source == nil {
		return
	}

	for _, key := range source.Keys() {
		val := source.Get(key)
		target.Set(key, val)
	}
}
