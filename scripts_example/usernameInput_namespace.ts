// usernameInput - TextInput脚本（命名空间版本）
// 演示如何使用对象包裹避免函数名冲突

/// <reference path="../script-types.d.ts" />
/// <reference path="../ui_example.d.ts" />

/**
 * 用户名输入框命名空间
 * 使用对象包裹后，多个脚本文件可以定义同名方法而不冲突
 */
const usernameInput = {
    /**
     * 文本改变事件
     */
    onChange(self: UITextInput, event: TextInputChangeEvent): void {
        console.log("Username input changed:", event.text);
        console.log("Input ID:", self.getID());
        
        // 实时验证用户名
        const username = event.text;
        
        // 验证规则
        if (username.length === 0) {
            this.clearValidation();
            return;
        }
        
        if (username.length < 3) {
            this.showValidationError("用户名至少3个字符");
        } else if (username.length > 20) {
            this.showValidationError("用户名最多20个字符");
        } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            this.showValidationError("只能包含字母、数字和下划线");
        } else {
            this.showValidationSuccess("用户名可用");
            
            // 仅在用户输入时检查可用性
            if (event.isUserInput) {
                this.checkUsernameAvailability(username);
            }
        }
        
        // 保存到全局状态（临时）
        Global.tempUsername = username;
    },
    
    /**
     * 获得焦点事件
     */
    onFocus(self: UITextInput, event: FocusEvent): void {
        console.log("Username input focused");
        
        // 高亮边框
        self.setColor(100, 150, 255, 255);
        
        // 显示提示
        RootElement.loginPanel.hintLabel.setText("请输入3-20个字符");
        RootElement.loginPanel.hintLabel.setVisible(true);
        
        // 记录焦点状态
        Global.usernameInputFocused = true;
    },
    
    /**
     * 失去焦点事件
     */
    onBlur(self: UITextInput, event: BlurEvent): void {
        console.log("Username input blurred");
        
        // 恢复默认边框
        self.setColor(200, 200, 200, 255);
        
        // 隐藏提示
        RootElement.loginPanel.hintLabel.setVisible(false);
        
        // 最终验证
        if (event.text && event.text.length > 0 && event.text.length < 3) {
            this.showValidationError("用户名太短");
        }
        
        // 清除焦点状态
        Global.usernameInputFocused = false;
    },
    
    /**
     * 按键事件
     */
    onKeyPress(self: UITextInput, event: KeyPressEvent): void {
        // 处理特殊按键
        if (event.key === "Escape") {
            self.setText(""); // 清空输入
            this.clearValidation();
        }
        
        // Enter键提交
        if (event.key === "Enter") {
            const text = self.getText();
            if (text.length >= 3) {
                // 聚焦到密码框
                RootElement.loginPanel.passwordInput.setFocus();
            } else {
                this.showValidationError("请先输入有效用户名");
            }
        }
        
        // 组合键示例
        if (event.ctrlKey && event.key === "a") {
            console.log("Ctrl+A pressed - Select all");
        }
    },
    
    // ========== 辅助方法（私有方法） ==========
    
    /**
     * 显示验证错误
     */
    showValidationError(message: string): void {
        const errorLabel = RootElement.loginPanel.usernameError;
        errorLabel.setText(message);
        errorLabel.setColor(255, 50, 50, 255); // 红色
        errorLabel.setVisible(true);
    },
    
    /**
     * 显示验证成功
     */
    showValidationSuccess(message: string): void {
        const errorLabel = RootElement.loginPanel.usernameError;
        errorLabel.setText(message);
        errorLabel.setColor(50, 200, 50, 255); // 绿色
        errorLabel.setVisible(true);
    },
    
    /**
     * 清除验证信息
     */
    clearValidation(): void {
        const errorLabel = RootElement.loginPanel.usernameError;
        errorLabel.setVisible(false);
    },
    
    /**
     * 检查用户名是否已存在（模拟异步检查）
     */
    checkUsernameAvailability(username: string): void {
        // 在实际应用中，这里会调用后端API
        setTimeout(() => {
            const existingUsers: string[] = ["admin", "test", "user"];
            if (existingUsers.indexOf(username.toLowerCase()) !== -1) {
                this.showValidationError("用户名已被使用");
            } else {
                this.showValidationSuccess("用户名可用");
            }
        }, 500);
    }
};
