# Phase 4: UI树构建和RootElement代理对象

**阶段目标**：实现完整的UI树结构，创建RootElement全局对象，支持层级访问和控件查找。

**预计时间**：3天  
**开始日期**：2025年12月26日  
**状态**：🔄 进行中

---

## 目标清单

- [ ] 设计UI树数据结构
  - [ ] UITreeNode结构定义
  - [ ] 支持层级访问
  - [ ] 缓存机制

- [ ] 实现BuildUITree函数
  - [ ] 从控件列表构建树
  - [ ] 处理父子关系
  - [ ] 验证树结构

- [ ] 实现RootElement代理对象
  - [ ] 支持点号访问（panel.button模式）
  - [ ] 动态属性查找
  - [ ] 返回控件API对象

- [ ] 实现查找API
  - [ ] getElementById()
  - [ ] getByName()
  - [ ] querySelector()（可选）
  - [ ] getChildren()

- [ ] 集成到ScriptEngine
  - [ ] 在VM初始化时注入RootElement
  - [ ] 控件更新时重建UI树
  - [ ] 错误处理

- [ ] 编写测试
  - [ ] UI树构建测试
  - [ ] RootElement访问测试
  - [ ] 查找API测试
  - [ ] 错误处理测试

---

## 设计方案

### 1. UI树结构

```go
// UITreeNode UI树节点
type UITreeNode struct {
    Widget   Widget              // 控件实例
    ID       string              // 控件ID
    Children []*UITreeNode       // 子节点
    Parent   *UITreeNode         // 父节点（用于向上查找）
}

// UITree UI树
type UITree struct {
    Root     *UITreeNode         // 根节点
    IDMap    map[string]*UITreeNode  // ID索引（快速查找）
    WidgetMap map[Widget]*UITreeNode // Widget索引
}
```

### 2. BuildUITree算法

```go
// BuildUITree 从控件列表构建UI树
func BuildUITree(widgets []Widget) *UITree {
    // Step 1: 创建所有节点并建立ID索引
    tree := &UITree{
        IDMap:    make(map[string]*UITreeNode),
        WidgetMap: make(map[Widget]*UITreeNode),
    }
    
    for _, widget := range widgets {
        node := &UITreeNode{
            Widget:   widget,
            ID:       widget.GetID(),
            Children: []*UITreeNode{},
        }
        tree.IDMap[node.ID] = node
        tree.WidgetMap[widget] = node
    }
    
    // Step 2: 建立父子关系
    var rootNodes []*UITreeNode
    for _, node := range tree.IDMap {
        parentID := node.Widget.GetParentID()
        if parentID == "" || parentID == "root" {
            // 根节点
            rootNodes = append(rootNodes, node)
        } else {
            // 查找父节点
            parent := tree.IDMap[parentID]
            if parent != nil {
                parent.Children = append(parent.Children, node)
                node.Parent = parent
            } else {
                // 父节点不存在，视为根节点
                rootNodes = append(rootNodes, node)
            }
        }
    }
    
    // Step 3: 创建虚拟根节点（如果有多个根）
    if len(rootNodes) == 1 {
        tree.Root = rootNodes[0]
    } else {
        tree.Root = &UITreeNode{
            ID:       "root",
            Children: rootNodes,
        }
        for _, node := range rootNodes {
            node.Parent = tree.Root
        }
    }
    
    return tree
}
```

### 3. RootElement代理对象

**JavaScript访问模式**:
```typescript
// 层级访问
RootElement.loginPanel.usernameInput.setText("hello");

// 等价于
RootElement.getElementById("loginPanel")
           .getElementById("usernameInput")
           .setText("hello");
```

**实现方案（Go中创建动态对象）**:

```go
// createRootElement 创建RootElement全局对象
func (se *ScriptEngine) createRootElement(tree *UITree) *goja.Object {
    se.vmMu.Lock()
    defer se.vmMu.Unlock()
    
    rootElement := se.vm.NewObject()
    
    // 添加查找方法
    rootElement.Set("getElementById", func(id string) *goja.Object {
        return se.getWidgetAPIByID(id)
    })
    
    rootElement.Set("getByName", func(name string) []*goja.Object {
        return se.getWidgetAPIsByName(name)
    })
    
    // 动态属性：为每个直接子节点创建访问器
    if tree.Root != nil {
        for _, child := range tree.Root.Children {
            se.addChildAccessor(rootElement, child)
        }
    }
    
    return rootElement
}

// addChildAccessor 为子节点添加访问器（递归）
func (se *ScriptEngine) addChildAccessor(parent *goja.Object, node *UITreeNode) {
    // 创建当前节点的代理对象
    proxy := se.vm.NewObject()
    
    // 添加控件API方法（setText, setColor等）
    widgetAPI := se.createWidgetAPI(node.ID, node.Widget.GetType())
    se.copyObjectProperties(widgetAPI, proxy)
    
    // 递归添加子节点访问器
    for _, child := range node.Children {
        se.addChildAccessor(proxy, child)
    }
    
    // 将代理对象设置为父对象的属性
    parent.Set(node.ID, proxy)
}
```

**问题**: goja不支持动态Getter/Setter，需要预先构建所有属性。

**优化方案**: 懒加载 + 缓存

```go
// 使用函数+闭包实现懒加载
func (se *ScriptEngine) createLazyRootElement(tree *UITree) *goja.Object {
    cache := make(map[string]*goja.Object) // 缓存已创建的代理
    
    var createProxy func(node *UITreeNode) *goja.Object
    createProxy = func(node *UITreeNode) *goja.Object {
        if cached, ok := cache[node.ID]; ok {
            return cached
        }
        
        proxy := se.vm.NewObject()
        
        // 复制控件API方法
        api := se.createWidgetAPI(node.ID, node.Widget.GetType())
        se.copyObjectProperties(api, proxy)
        
        // 添加子节点访问器
        for _, child := range node.Children {
            childProxy := createProxy(child)
            proxy.Set(child.ID, childProxy)
        }
        
        cache[node.ID] = proxy
        return proxy
    }
    
    rootElement := se.vm.NewObject()
    
    // 添加查找方法
    rootElement.Set("getElementById", func(id string) *goja.Object {
        if node := tree.IDMap[id]; node != nil {
            return createProxy(node)
        }
        return nil
    })
    
    // 添加根节点的子节点
    if tree.Root != nil {
        for _, child := range tree.Root.Children {
            childProxy := createProxy(child)
            rootElement.Set(child.ID, childProxy)
        }
    }
    
    return rootElement
}
```

---

## 实施步骤

### Step 1: 创建ui_tree.go文件

**文件**: `ui/ui_tree.go`

```go
package ui

// UITreeNode UI树节点
type UITreeNode struct {
    Widget   Widget              // 控件实例
    ID       string              // 控件ID
    Children []*UITreeNode       // 子节点
    Parent   *UITreeNode         // 父节点
}

// UITree UI树结构
type UITree struct {
    Root      *UITreeNode                // 根节点
    IDMap     map[string]*UITreeNode     // ID索引
    WidgetMap map[Widget]*UITreeNode     // Widget索引
}

// BuildUITree 从控件列表构建UI树
func BuildUITree(widgets []Widget) *UITree {
    tree := &UITree{
        IDMap:     make(map[string]*UITreeNode),
        WidgetMap: make(map[Widget]*UITreeNode),
    }
    
    // 创建所有节点
    for _, widget := range widgets {
        node := &UITreeNode{
            Widget:   widget,
            ID:       widget.GetID(),
            Children: []*UITreeNode{},
        }
        tree.IDMap[node.ID] = node
        tree.WidgetMap[widget] = node
    }
    
    // 建立父子关系
    var rootNodes []*UITreeNode
    for _, node := range tree.IDMap {
        parentID := node.Widget.GetParentID()
        if parentID == "" || parentID == "root" {
            rootNodes = append(rootNodes, node)
        } else {
            parent := tree.IDMap[parentID]
            if parent != nil {
                parent.Children = append(parent.Children, node)
                node.Parent = parent
            } else {
                rootNodes = append(rootNodes, node)
            }
        }
    }
    
    // 创建虚拟根节点
    if len(rootNodes) == 1 {
        tree.Root = rootNodes[0]
    } else {
        tree.Root = &UITreeNode{
            ID:       "root",
            Children: rootNodes,
        }
        for _, node := range rootNodes {
            node.Parent = tree.Root
        }
    }
    
    return tree
}

// FindByID 通过ID查找节点
func (tree *UITree) FindByID(id string) *UITreeNode {
    return tree.IDMap[id]
}

// FindByWidget 通过Widget查找节点
func (tree *UITree) FindByWidget(widget Widget) *UITreeNode {
    return tree.WidgetMap[widget]
}

// GetChildren 获取节点的所有子节点
func (node *UITreeNode) GetChildren() []*UITreeNode {
    return node.Children
}

// GetParent 获取父节点
func (node *UITreeNode) GetParent() *UITreeNode {
    return node.Parent
}

// IsRoot 是否为根节点
func (node *UITreeNode) IsRoot() bool {
    return node.Parent == nil || node.Parent.Widget == nil
}

// GetDepth 获取节点深度（根节点为0）
func (node *UITreeNode) GetDepth() int {
    depth := 0
    current := node.Parent
    for current != nil && current.Widget != nil {
        depth++
        current = current.Parent
    }
    return depth
}
```

### Step 2: 扩展script_api.go - 添加RootElement创建

**文件**: `ui/script_api.go`

```go
// createRootElement 创建RootElement全局对象
func (se *ScriptEngine) createRootElement(tree *UITree) *goja.Object {
    rootElement := se.vm.NewObject()
    
    // 缓存代理对象
    proxyCache := make(map[string]*goja.Object)
    
    // 创建节点代理的递归函数
    var createNodeProxy func(node *UITreeNode) *goja.Object
    createNodeProxy = func(node *UITreeNode) *goja.Object {
        if cached, ok := proxyCache[node.ID]; ok {
            return cached
        }
        
        proxy := se.vm.NewObject()
        
        // 复制控件API方法
        if node.Widget != nil {
            api := se.createWidgetAPI(node.ID, node.Widget.GetType())
            se.copyObjectProperties(api, proxy)
        }
        
        // 添加子节点访问器
        for _, child := range node.Children {
            childProxy := createNodeProxy(child)
            proxy.Set(child.ID, childProxy)
        }
        
        proxyCache[node.ID] = proxy
        return proxy
    }
    
    // getElementById方法
    rootElement.Set("getElementById", func(id string) *goja.Object {
        if node := tree.FindByID(id); node != nil {
            return createNodeProxy(node)
        }
        return se.vm.ToValue(nil).ToObject(se.vm)
    })
    
    // getChildren方法（获取根节点的子节点）
    rootElement.Set("getChildren", func() []*goja.Object {
        var children []*goja.Object
        if tree.Root != nil {
            for _, child := range tree.Root.Children {
                children = append(children, createNodeProxy(child))
            }
        }
        return children
    })
    
    // 添加根节点的直接子节点作为属性
    if tree.Root != nil {
        for _, child := range tree.Root.Children {
            childProxy := createNodeProxy(child)
            rootElement.Set(child.ID, childProxy)
        }
    }
    
    return rootElement
}

// copyObjectProperties 复制对象的所有属性
func (se *ScriptEngine) copyObjectProperties(src, dst *goja.Object) {
    for _, key := range src.Keys() {
        value := src.Get(key)
        dst.Set(key, value)
    }
}
```

### Step 3: 修改ScriptEngine集成UI树

**文件**: `ui/script_engine.go`

```go
// ScriptEngine 添加UI树字段
type ScriptEngine struct {
    vm           *goja.Runtime
    eventQueue   *EventQueue
    commandQueue *CommandQueue
    scripts      sync.Map
    bindings     sync.Map
    config       ScriptEngineConfig
    running      bool
    stopChan     chan struct{}
    runningMu    sync.RWMutex
    vmMu         sync.Mutex
    
    // 新增：UI树
    uiTree       *UITree         // UI控件树
    uiTreeMu     sync.RWMutex    // 保护UI树访问
}

// SetUITree 设置UI树（在加载UI布局后调用）
func (se *ScriptEngine) SetUITree(widgets []Widget) {
    se.uiTreeMu.Lock()
    defer se.uiTreeMu.Unlock()
    
    // 构建UI树
    se.uiTree = BuildUITree(widgets)
    
    // 重新注入RootElement
    se.vmMu.Lock()
    rootElement := se.createRootElement(se.uiTree)
    se.vm.Set("RootElement", rootElement)
    se.vmMu.Unlock()
}

// GetUITree 获取UI树（用于测试）
func (se *ScriptEngine) GetUITree() *UITree {
    se.uiTreeMu.RLock()
    defer se.uiTreeMu.RUnlock()
    return se.uiTree
}
```

---

## 使用示例

### JavaScript脚本

```typescript
// 层级访问
const loginButton = {
    onClick(self: UIButton, event: ButtonClickEvent) {
        // 访问其他控件
        const username = RootElement.loginPanel.usernameInput.getText();
        const password = RootElement.loginPanel.passwordInput.getText();
        
        console.log("Username:", username);
        console.log("Password:", password);
        
        // 通过ID查找
        const errorLabel = RootElement.getElementById("errorLabel");
        if (errorLabel) {
            errorLabel.setText("登录成功！");
            errorLabel.setVisible(true);
        }
        
        // 修改其他控件
        RootElement.mainPanel.statusLabel.setText("Welcome, " + username);
    }
};
```

### Go测试代码

```go
func TestUITree_Build(t *testing.T) {
    // 创建测试控件
    panel := &MockWidget{id: "panel1", parentID: "root"}
    button1 := &MockWidget{id: "button1", parentID: "panel1"}
    button2 := &MockWidget{id: "button2", parentID: "panel1"}
    label := &MockWidget{id: "label1", parentID: "root"}
    
    widgets := []Widget{panel, button1, button2, label}
    
    // 构建UI树
    tree := BuildUITree(widgets)
    
    // 验证结构
    if tree.Root == nil {
        t.Fatal("Root is nil")
    }
    
    if len(tree.Root.Children) != 2 {
        t.Errorf("Expected 2 root children, got %d", len(tree.Root.Children))
    }
    
    panelNode := tree.FindByID("panel1")
    if panelNode == nil {
        t.Fatal("panel1 not found")
    }
    
    if len(panelNode.Children) != 2 {
        t.Errorf("Expected 2 panel children, got %d", len(panelNode.Children))
    }
}

func TestScriptEngine_RootElement(t *testing.T) {
    eq := NewEventQueue()
    cq := NewCommandQueue()
    defer eq.Close()
    
    config := DefaultScriptEngineConfig()
    engine := NewScriptEngine(eq, cq, config)
    
    // 创建UI树
    panel := &MockWidget{id: "loginPanel", widgetType: TypePanel}
    input := &MockWidget{id: "usernameInput", parentID: "loginPanel", widgetType: TypeTextInput}
    button := &MockWidget{id: "loginButton", parentID: "loginPanel", widgetType: TypeButton}
    
    engine.SetUITree([]Widget{panel, input, button})
    
    // 加载测试脚本
    script := `
        const loginButton = {
            onClick(self, event) {
                // 测试层级访问
                const input = RootElement.loginPanel.usernameInput;
                input.setText("TestUser");
                
                // 测试getElementById
                const panel = RootElement.getElementById("loginPanel");
                console.log("Found panel:", panel.getID());
                
                Global.testPassed = true;
            }
        };
    `
    engine.LoadScript("test.js", script)
    
    binding := &WidgetScriptBinding{
        WidgetID:   "loginButton",
        ScriptPath: "test.js",
        Handlers: map[EventType]string{
            EventClick: "loginButton.onClick",
        },
        WidgetType: TypeButton,
    }
    engine.RegisterWidget("loginButton", binding)
    
    // 启动并触发事件
    engine.Start()
    defer engine.Stop()
    
    eq.Push(WidgetEvent{
        Type:     EventClick,
        WidgetID: "loginButton",
    })
    
    time.Sleep(50 * time.Millisecond)
    
    // 验证结果
    vm := engine.GetVM()
    engine.vmMu.Lock()
    global := vm.Get("Global")
    engine.vmMu.Unlock()
    
    globalObj := global.ToObject(vm)
    testPassed := globalObj.Get("testPassed")
    
    if !testPassed.ToBoolean() {
        t.Error("RootElement access failed")
    }
    
    // 验证命令
    commands := cq.PopAll()
    if len(commands) != 1 {
        t.Errorf("Expected 1 command, got %d", len(commands))
    }
    
    if commands[0].Value != "TestUser" {
        t.Errorf("Expected setText 'TestUser', got %v", commands[0].Value)
    }
}
```

---

## 性能优化

### 1. 代理缓存
- 一次构建，多次复用
- 避免重复创建代理对象

### 2. 延迟加载
- 只在首次访问时创建子节点代理
- 减少初始化开销

### 3. ID索引
- 使用map快速查找
- O(1)时间复杂度

---

## 注意事项

### 1. 线程安全
- UI树可能在主线程更新
- 脚本在独立协程访问
- 使用读写锁保护

### 2. 控件生命周期
- 控件可能被删除
- 需要处理dangling pointer
- 考虑使用弱引用或ID查找

### 3. 内存管理
- 代理对象缓存可能导致内存泄漏
- 考虑定期清理或使用LRU缓存

---

## 遇到的问题和解决方案

_(待记录)_

---

## 验收标准

- [ ] 可以从控件列表构建UI树
- [ ] RootElement.panel.button层级访问正常
- [ ] getElementById返回正确的控件API
- [ ] 可以通过RootElement操作其他控件
- [ ] 父子关系正确建立
- [ ] 所有单元测试通过
- [ ] 无race condition

---

## 下一步

Phase 4完成后，进入 [Phase 5: TypeScript类型定义生成器](./phase5-typescript-gen.md)

---

## 时间记录

- **开始**: 2025年12月26日
- **完成**: 待定
- **实际耗时**: 待定
