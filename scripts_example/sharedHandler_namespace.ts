// sharedHandler - 多个按钮共享的脚本（命名空间版本）
// 展示如何使用命名空间处理多个控件

/// <reference path="../script-types.d.ts" />
/// <reference path="../ui_example.d.ts" />

/**
 * 共享处理器命名空间
 * 适用于多个按钮绑定同一个脚本的场景
 */
const sharedHandler = {
    /**
     * 共享的点击事件处理器
     */
    onClick(self: UIButton, event: ButtonClickEvent): void {
        // self 就是当前点击的按钮控件
        const buttonId = self.getID();
        const buttonText = self.getText();
        
        console.log(`Button clicked: ${buttonId} (${buttonText})`);
        
        // 根据按钮ID执行不同逻辑
        switch (buttonId) {
            case "saveButton":
                this.handleSave(self);
                break;
            
            case "cancelButton":
                this.handleCancel(self);
                break;
            
            case "deleteButton":
                this.handleDelete(self);
                break;
            
            case "exportButton":
                this.handleExport(self);
                break;
            
            default:
                console.log(`Unknown button: ${buttonId}`);
        }
        
        // 记录点击统计
        this.recordButtonClick(buttonId);
    },
    
    /**
     * 共享的悬停事件处理器
     */
    onHover(self: UIButton, event: MouseHoverEvent): void {
        const buttonId = self.getID();
        
        // 通用悬停效果
        self.setColor(200, 220, 255, 255);
        
        // 显示提示信息
        this.showTooltip(buttonId, event.mouseX, event.mouseY);
    },
    
    // ========== 按钮处理方法 ==========
    
    /**
     * 处理保存按钮
     */
    handleSave(button: UIButton): void {
        console.log("Saving data...");
        
        button.setText("保存中...");
        button.setEnabled(false);
        
        // 模拟保存操作
        setTimeout(() => {
            button.setText("保存成功");
            button.setColor(50, 200, 50, 255);
            
            // 恢复按钮
            setTimeout(() => {
                button.setText("保存");
                button.setColor(120, 170, 255, 255);
                button.setEnabled(true);
            }, 1000);
        }, 1000);
    },
    
    /**
     * 处理取消按钮
     */
    handleCancel(button: UIButton): void {
        console.log("Cancelling operation...");
        
        button.setText("已取消");
        
        // 清理临时数据
        if (Global.tempData) {
            delete Global.tempData;
        }
        
        setTimeout(() => {
            button.setText("取消");
        }, 1000);
    },
    
    confirm(message: string): boolean {
        // 简单封装浏览器的confirm函数
        return true; // 替换为实际实现
    },

    /**
     * 处理删除按钮
     */
    handleDelete(button: UIButton): void {
        console.log("Deleting...");
        
        // 确认删除
        if (this.confirm("确定要删除吗？")) {
            button.setText("删除中...");
            button.setColor(255, 100, 100, 255);
            
            setTimeout(() => {
                console.log("Deleted successfully");
                button.setText("已删除");
            }, 500);
        } else {
            console.log("Delete cancelled");
        }
    },
    
    /**
     * 处理导出按钮
     */
    handleExport(button: UIButton): void {
        console.log("Exporting...");
        
        button.setText("导出中...");
        button.setEnabled(false);
        
        setTimeout(() => {
            console.log("Export completed");
            button.setText("导出完成");
            button.setColor(50, 200, 50, 255);
            
            setTimeout(() => {
                button.setText("导出");
                button.setColor(120, 170, 255, 255);
                button.setEnabled(true);
            }, 1500);
        }, 2000);
    },
    
    // ========== 辅助方法 ==========
    
    /**
     * 记录按钮点击统计
     */
    recordButtonClick(buttonId: string): void {
        if (!Global.buttonStats) {
            Global.buttonStats = {};
        }
        
        if (!Global.buttonStats[buttonId]) {
            Global.buttonStats[buttonId] = 0;
        }
        
        Global.buttonStats[buttonId]++;
        
        console.log(`Button ${buttonId} clicked ${Global.buttonStats[buttonId]} times`);
    },
    
    /**
     * 显示提示信息
     */
    showTooltip(buttonId: string, x: number, y: number): void {
        const tooltips: Record<string, string> = {
            saveButton: "保存当前更改",
            cancelButton: "取消当前操作",
            deleteButton: "删除选中项",
            exportButton: "导出数据"
        };
        
        const message = tooltips[buttonId] || "未知按钮";
        console.log(`Tooltip: ${message} at (${x}, ${y})`);
        
        // 在实际应用中，这里会显示一个浮动提示框
        // RootElement.tooltip.setText(message);
        // RootElement.tooltip.setPosition(x, y);
        // RootElement.tooltip.setVisible(true);
    }
};


/**
 * 注册说明：
 * 
 * // 保存按钮
 * const saveBinding = {
 *     WidgetID: "saveButton",
 *     ScriptPath: "sharedHandler.js",
 *     Handlers: {
 *         EventClick: "sharedHandler.onClick",
 *         EventHover: "sharedHandler.onHover"
 *     },
 *     WidgetType: TypeButton
 * };
 * 
 * // 取消按钮
 * const cancelBinding = {
 *     WidgetID: "cancelButton",
 *     ScriptPath: "sharedHandler.js",
 *     Handlers: {
 *         EventClick: "sharedHandler.onClick",
 *         EventHover: "sharedHandler.onHover"
 *     },
 *     WidgetType: TypeButton
 * };
 * 
 * // 删除按钮
 * const deleteBinding = {
 *     WidgetID: "deleteButton",
 *     ScriptPath: "sharedHandler.js",
 *     Handlers: {
 *         EventClick: "sharedHandler.onClick"
 *     },
 *     WidgetType: TypeButton
 * };
 */
