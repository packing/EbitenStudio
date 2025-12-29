/**
 * Phase 4 示例：使用 RootElement 访问其他控件
 * 
 * 这个脚本展示了如何使用 RootElement 全局对象来访问 UI 树中的其他控件。
 * RootElement 提供了多种方式访问控件：
 * 1. 点号层级访问：RootElement.panel.button
 * 2. getElementById：通过ID查找
 * 3. getByType：查找所有指定类型的控件
 */

// 登录按钮命名空间
const loginButton = {
    /**
     * 点击登录按钮时的处理函数
     * 
     * 功能：
     * - 从输入框获取用户名和密码
     * - 验证输入
     * - 显示结果消息
     * 
     * @param self - 登录按钮自身的API对象
     * @param event - 点击事件对象
     */
    onClick(self: UIButton, event: ButtonClickEvent) {
        console.log("Login button clicked");

        // === 方式1: 使用点号层级访问 ===
        // 这是最直观的方式，类似于 DOM 树访问
        const username = RootElement.loginPanel.usernameInput.getText();
        const password = RootElement.loginPanel.passwordInput.getText();

        console.log("Username:", username);
        console.log("Password:", password);

        // 验证输入
        let message = "";
        let isValid = true;

        if (!username || username.length === 0) {
            message = "请输入用户名";
            isValid = false;
        } else if (!password || password.length === 0) {
            message = "请输入密码";
            isValid = false;
        } else if (password.length < 6) {
            message = "密码至少6位";
            isValid = false;
        } else {
            message = "登录成功！";
        }

        // === 方式2: 使用 getElementById 查找 ===
        // 当你知道控件ID但不知道它的层级位置时使用
        const messageLabel = RootElement.getElementById("messageLabel");
        if (messageLabel) {
            messageLabel.setText(message);
            // 根据验证结果设置不同颜色
            if (isValid) {
                messageLabel.setColor(0, 200, 0, 255); // 绿色
            } else {
                messageLabel.setColor(200, 0, 0, 255); // 红色
            }
        }

        // 如果验证成功，清空输入框并禁用按钮
        if (isValid) {
            RootElement.loginPanel.usernameInput.setText("");
            RootElement.loginPanel.passwordInput.setText("");
            
            // 禁用登录按钮防止重复提交
            self.setEnabled(false);
            
            // 3秒后重新启用
            Global.setTimeout(() => {
                self.setEnabled(true);
                messageLabel.setText("");
            }, 3000);
        }
    }
};

// 用户名输入框命名空间
const usernameInput = {
    /**
     * 输入框内容改变时的处理函数
     * 
     * 功能：
     * - 清除之前的错误消息
     * - 自动聚焦到密码框（如果输入达到一定长度）
     */
    onChange(self: UITextInput, event: TextChangeEvent) {
        const text = self.getText();
        
        // 清除错误消息
        const messageLabel = RootElement.getElementById("messageLabel");
        if (messageLabel) {
            messageLabel.setText("");
        }

        // 如果用户名达到3个字符，自动聚焦到密码框
        if (text.length >= 3) {
            RootElement.loginPanel.passwordInput.focus();
        }
    }
};

// 密码输入框命名空间
const passwordInput = {
    /**
     * 输入框内容改变时的处理函数
     * 
     * 功能：
     * - 实时显示密码强度
     */
    onChange(self: UITextInput, event: TextChangeEvent) {
        const password = self.getText();
        
        // === 方式3: 使用 getByType 查找所有标签 ===
        // 当你想操作所有同类型控件时使用
        const allLabels = RootElement.getByType("label");
        console.log(`Found ${allLabels.length} labels in the UI`);

        // 查找密码强度标签
        const strengthLabel = RootElement.getElementById("passwordStrength");
        if (strengthLabel) {
            if (password.length === 0) {
                strengthLabel.setText("");
            } else if (password.length < 6) {
                strengthLabel.setText("弱");
                strengthLabel.setColor(200, 0, 0, 255);
            } else if (password.length < 10) {
                strengthLabel.setText("中");
                strengthLabel.setColor(200, 200, 0, 255);
            } else {
                strengthLabel.setText("强");
                strengthLabel.setColor(0, 200, 0, 255);
            }
        }
    },

    /**
     * 按下回车键时触发登录
     */
    onEnter(self: UITextInput, event: KeyEvent) {
        // 使用层级访问触发登录按钮点击
        const loginBtn = RootElement.loginPanel.loginButton;
        if (loginBtn.isEnabled()) {
            loginBtn.click();
        }
    }
};

// 重置按钮命名空间
const resetButton = {
    /**
     * 点击重置按钮
     * 
     * 功能：
     * - 清空所有输入框
     * - 清空所有消息
     * - 重置控件状态
     */
    onClick(self: UIButton, event: ButtonClickEvent) {
        console.log("Reset button clicked");

        // 使用点号访问清空输入框
        RootElement.loginPanel.usernameInput.setText("");
        RootElement.loginPanel.passwordInput.setText("");

        // 使用getElementById清空消息
        const messageLabel = RootElement.getElementById("messageLabel");
        if (messageLabel) {
            messageLabel.setText("");
        }

        const strengthLabel = RootElement.getElementById("passwordStrength");
        if (strengthLabel) {
            strengthLabel.setText("");
        }

        // 启用登录按钮
        RootElement.loginPanel.loginButton.setEnabled(true);

        // 聚焦到用户名输入框
        RootElement.loginPanel.usernameInput.focus();
    }
};

/**
 * 预期的 UI 结构：
 * 
 * - loginPanel (Panel)
 *   - usernameInput (TextInput)
 *   - passwordInput (TextInput)
 *   - loginButton (Button)
 *   - resetButton (Button)
 * - messageLabel (Label) - 顶层，显示提示消息
 * - passwordStrength (Label) - 顶层，显示密码强度
 * 
 * RootElement API 使用说明：
 * 
 * 1. 层级访问（最常用）：
 *    RootElement.loginPanel.usernameInput.getText()
 *    - 优点：直观，IDE有自动补全
 *    - 缺点：需要知道完整的层级路径
 * 
 * 2. getElementById（灵活）：
 *    RootElement.getElementById("messageLabel")
 *    - 优点：不需要知道层级，直接通过ID查找
 *    - 缺点：返回值可能为null，需要检查
 * 
 * 3. getByType（批量操作）：
 *    RootElement.getByType("button")
 *    - 优点：可以找到所有同类型控件
 *    - 缺点：返回数组，需要遍历
 * 
 * 4. findDescendant（子树查找）：
 *    RootElement.loginPanel.findDescendant("loginButton")
 *    - 优点：在子树中查找，范围更精确
 *    - 缺点：需要知道父节点
 * 
 * 5. getParent/getChildren（树遍历）：
 *    usernameInput.getParent() // 返回 loginPanel
 *    loginPanel.getChildren() // 返回 [usernameInput, passwordInput, ...]
 */
