/**
 * 侧边栏宽度调整器
 * 允许用户拖拽调整左右侧边栏的宽度
 */
class SidebarResizer {
  constructor() {
    this.leftSidebar = document.querySelector('.sidebar-left');
    this.rightSidebar = document.querySelector('.sidebar-right');
    this.leftHandle = this.leftSidebar?.querySelector('.resize-handle');
    this.rightHandle = this.rightSidebar?.querySelector('.resize-handle');
    
    this.isDragging = false;
    this.currentSidebar = null;
    this.startX = 0;
    this.startWidth = 0;
    
    this.init();
  }
  
  init() {
    if (this.leftHandle) {
      this.leftHandle.addEventListener('mousedown', (e) => this.startResize(e, this.leftSidebar, 'left'));
    }
    
    if (this.rightHandle) {
      this.rightHandle.addEventListener('mousedown', (e) => this.startResize(e, this.rightSidebar, 'right'));
    }
    
    document.addEventListener('mousemove', (e) => this.resize(e));
    document.addEventListener('mouseup', () => this.stopResize());
    
    // 监听滚动和窗口大小变化，更新 handle 位置
    this.updateHandlePositions();
    window.addEventListener('resize', () => this.updateHandlePositions());
    
    if (this.leftSidebar) {
      this.leftSidebar.addEventListener('scroll', () => this.updateHandlePositions());
      
      // 监听左侧边栏内容变化
      const leftObserver = new MutationObserver(() => this.updateHandlePositions());
      leftObserver.observe(this.leftSidebar, { 
        childList: true, 
        subtree: true, 
        attributes: true,
        characterData: true 
      });
    }
    
    if (this.rightSidebar) {
      this.rightSidebar.addEventListener('scroll', () => this.updateHandlePositions());
      
      // 监听右侧边栏内容变化
      const rightObserver = new MutationObserver(() => this.updateHandlePositions());
      rightObserver.observe(this.rightSidebar, { 
        childList: true, 
        subtree: true, 
        attributes: true,
        characterData: true 
      });
    }
  }
  
  updateHandlePositions() {
    // 更新左侧 handle - 使用 scrollHeight 获取完整内容高度
    if (this.leftHandle && this.leftSidebar) {
      const scrollHeight = this.leftSidebar.scrollHeight;
      this.leftHandle.style.height = `${scrollHeight}px`;
      this.leftHandle.style.top = '0';
    }
    
    // 更新右侧 handle - 使用 scrollHeight 获取完整内容高度
    if (this.rightHandle && this.rightSidebar) {
      const scrollHeight = this.rightSidebar.scrollHeight;
      this.rightHandle.style.height = `${scrollHeight}px`;
      this.rightHandle.style.top = '0';
    }
  }
  
  startResize(e, sidebar, side) {
    this.isDragging = true;
    this.currentSidebar = sidebar;
    this.currentSide = side;
    this.startX = e.clientX;
    this.startWidth = parseInt(window.getComputedStyle(sidebar).width, 10);
    
    // 添加拖拽样式
    const handle = side === 'left' ? this.leftHandle : this.rightHandle;
    if (handle) {
      handle.classList.add('dragging');
    }
    
    // 防止文本选择
    e.preventDefault();
    document.body.style.cursor = 'col-resize';
  }
  
  resize(e) {
    if (!this.isDragging || !this.currentSidebar) return;
    
    const minWidth = parseInt(window.getComputedStyle(this.currentSidebar).minWidth, 10) || 200;
    const maxWidth = parseInt(window.getComputedStyle(this.currentSidebar).maxWidth, 10) || 500;
    
    let newWidth;
    if (this.currentSide === 'left') {
      // 左侧边栏: 向右拖动增加宽度
      const delta = e.clientX - this.startX;
      newWidth = this.startWidth + delta;
    } else {
      // 右侧边栏: 向左拖动增加宽度
      const delta = this.startX - e.clientX;
      newWidth = this.startWidth + delta;
    }
    
    // 限制在 min 和 max 之间
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    
    this.currentSidebar.style.width = newWidth + 'px';
    
    // 更新 handle 位置（因为宽度变化可能影响布局）
    this.updateHandlePositions();
  }
  
  stopResize() {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    document.body.style.cursor = '';
    
    // 移除拖拽样式
    if (this.leftHandle) {
      this.leftHandle.classList.remove('dragging');
    }
    if (this.rightHandle) {
      this.rightHandle.classList.remove('dragging');
    }
    
    this.currentSidebar = null;
    this.currentSide = null;
    
    // 最后更新一次 handle 位置
    this.updateHandlePositions();
  }
}

// 初始化侧边栏调整器
const sidebarResizer = new SidebarResizer();
