package ui

// UITreeNode UI树节点
type UITreeNode struct {
	Widget   Widget        // 控件实例
	ID       string        // 控件ID
	Children []*UITreeNode // 子节点
	Parent   *UITreeNode   // 父节点（用于向上查找）
}

// UITree UI树结构
type UITree struct {
	Root      *UITreeNode            // 根节点（虚拟根或单一根控件）
	IDMap     map[string]*UITreeNode // ID索引（快速查找）
	WidgetMap map[Widget]*UITreeNode // Widget索引
}

// BuildUITree 从控件列表构建UI树
func BuildUITree(widgets []Widget) *UITree {
	tree := &UITree{
		IDMap:     make(map[string]*UITreeNode),
		WidgetMap: make(map[Widget]*UITreeNode),
	}

	// Step 1: 创建所有节点并建立索引
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
			// 顶层节点（没有父节点或父节点为root）
			rootNodes = append(rootNodes, node)
		} else {
			// 查找父节点
			parent := tree.IDMap[parentID]
			if parent != nil {
				parent.Children = append(parent.Children, node)
				node.Parent = parent
			} else {
				// 父节点不存在，视为顶层节点
				rootNodes = append(rootNodes, node)
			}
		}
	}

	// Step 3: 创建虚拟根节点（包含所有顶层节点）
	if len(rootNodes) == 1 {
		// 只有一个顶层节点，直接作为根
		tree.Root = rootNodes[0]
	} else {
		// 多个顶层节点，创建虚拟根
		tree.Root = &UITreeNode{
			ID:       "root",
			Widget:   nil, // 虚拟根没有Widget
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

// GetAllDescendants 获取树中所有后代节点（从指定节点开始）
func (tree *UITree) GetAllDescendants(node *UITreeNode) []*UITreeNode {
	if node == nil {
		return []*UITreeNode{}
	}
	return node.GetAllDescendants()
}

// GetChildren 获取节点的所有子节点
func (node *UITreeNode) GetChildren() []*UITreeNode {
	return node.Children
}

// GetParent 获取父节点
func (node *UITreeNode) GetParent() *UITreeNode {
	return node.Parent
}

// IsRoot 是否为根节点（虚拟根或没有父节点）
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

// GetPath 获取从根到当前节点的路径（ID列表）
func (node *UITreeNode) GetPath() []string {
	path := []string{}
	current := node
	for current != nil && current.Widget != nil {
		path = append([]string{current.ID}, path...)
		current = current.Parent
	}
	return path
}

// FindDescendant 在子树中查找指定ID的节点
func (node *UITreeNode) FindDescendant(id string) *UITreeNode {
	if node.ID == id {
		return node
	}
	for _, child := range node.Children {
		if found := child.FindDescendant(id); found != nil {
			return found
		}
	}
	return nil
}

// GetAllDescendants 获取所有后代节点（递归）
func (node *UITreeNode) GetAllDescendants() []*UITreeNode {
	descendants := []*UITreeNode{}
	for _, child := range node.Children {
		descendants = append(descendants, child)
		descendants = append(descendants, child.GetAllDescendants()...)
	}
	return descendants
}

// GetSiblings 获取同级节点（不包括自己）
func (node *UITreeNode) GetSiblings() []*UITreeNode {
	if node.Parent == nil {
		return []*UITreeNode{}
	}
	siblings := []*UITreeNode{}
	for _, child := range node.Parent.Children {
		if child.ID != node.ID {
			siblings = append(siblings, child)
		}
	}
	return siblings
}
