// loginButton - Button脚本（命名空间版本）
// 演示如何使用对象包裹避免函数名冲突

/// <reference path="../script-types.d.ts" />
/// <reference path="../ui_example.d.ts" />

/**
 * 登录按钮命名空间
 * 使用对象包裹后，多个脚本文件可以定义同名方法而不冲突
 */
const loginButton = {
    /**
     * 按钮点击事件
     */
    onClick(self: UIButton, event: ButtonClickEvent): void {
        console.log("Login button clicked", event);
        
        // self 就是当前按钮控件本身，比event.target更直观
        console.log("Button ID:", self.getID());
        
        // 获取用户名和密码
        const username = RootElement.loginPanel.usernameInput.getText();
        const password = RootElement.loginPanel.passwordInput.getText();
        
        // 验证输入
        if (!username || username.length < 3) {
            this.showError("请输入有效的用户名（至少3个字符）");
            return;
        }
        
        if (!password || password.length < 6) {
            this.showError("请输入有效的密码（至少6个字符）");
            return;
        }
        
        // 显示加载状态
        self.setText("登录中...");
        self.setEnabled(false);
        
        // 记录登录尝试
        this.trackLoginAttempt();
        
        // 模拟登录请求
        this.performLogin(username, password, self);
    },
    
    /**
     * 悬停事件
     */
    onHover(self: UIButton, event: MouseHoverEvent): void {
        console.log("Login button hovered");
        
        // 悬停时改变颜色
        self.setColor(100, 150, 255, 255);
    },
    
    /**
     * 鼠标按下事件
     */
    onMouseDown(self: UIButton, event: MouseDownEvent): void {
        console.log("Login button mouse down");
        
        // 按下时的视觉反馈
        self.setColor(80, 120, 200, 255);
    },
    
    /**
     * 鼠标松开事件
     */
    onMouseUp(self: UIButton, event: MouseUpEvent): void {
        console.log("Login button mouse up");
        
        // 恢复正常颜色
        self.setColor(120, 170, 255, 255);
    },
    
    // ========== 辅助方法（私有方法） ==========
    
    /**
     * 显示错误信息
     */
    showError(message: string): void {
        const errorLabel = RootElement.loginPanel.errorLabel;
        errorLabel.setText(message);
        errorLabel.setColor(255, 50, 50, 255);
        errorLabel.setVisible(true);
        
        // 3秒后自动隐藏
        setTimeout(() => {
            errorLabel.setVisible(false);
        }, 3000);
    },
    
    /**
     * 记录登录尝试
     */
    trackLoginAttempt(): void {
        if (!Global.loginAttempts) {
            Global.loginAttempts = 0;
            Global.loginStartTime = Date.now();
        }
        Global.loginAttempts++;
        
        console.log(`Login attempt #${Global.loginAttempts}`);
        
        // 防止暴力破解
        if (Global.loginAttempts > 5) {
            const elapsed = Date.now() - Global.loginStartTime;
            if (elapsed < 60000) { // 1分钟内
                this.showError("尝试次数过多，请稍后再试");
                throw new Error("Too many login attempts");
            }
        }
    },
    
    /**
     * 执行登录
     */
    performLogin(username: string, password: string, button: UIButton): void {
        // 模拟网络请求（实际应用中会调用后端API）
        setTimeout(() => {
            // 模拟验证
            const success = (username === "admin" && password === "password123");
            
            if (success) {
                console.log("Login successful!");
                button.setText("登录成功");
                button.setColor(50, 200, 50, 255); // 绿色
                
                // 保存登录状态
                Global.isLoggedIn = true;
                Global.currentUser = username;
                
                // 跳转到主界面
                setTimeout(() => {
                    console.log("Navigating to main screen...");
                    // RootElement.navigateTo("mainScreen");
                }, 1000);
                
                // 清理临时数据
                delete Global.loginAttempts;
                delete Global.loginStartTime;
            } else {
                console.log("Login failed!");
                button.setText("登录失败");
                button.setColor(255, 100, 100, 255); // 红色
                button.setEnabled(true);
                
                this.showError("用户名或密码错误");
                
                // 1秒后恢复按钮
                setTimeout(() => {
                    button.setText("登录");
                    button.setColor(120, 170, 255, 255);
                }, 1000);
            }
        }, 1500);
    }
};
