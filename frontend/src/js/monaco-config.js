// Monaco Editor配置
const MonacoConfig = {
    // 初始化Monaco
    async init() {
        return new Promise((resolve, reject) => {
            require.config({ 
                paths: { 
                    'vs': '../node_modules/monaco-editor/min/vs' 
                } 
            });
            
            require(['vs/editor/editor.main'], function() {
                console.log('Monaco Editor loaded');
                resolve();
            }, reject);
        });
    },

    // 创建编辑器实例
    createEditor(container, options = {}) {
        const defaultOptions = {
            value: '',
            language: 'typescript',
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: true },
            fontSize: 14,
            tabSize: 4,
            insertSpaces: true,
            
            // TypeScript特定选项
            'typescript.suggest.completeFunctionCalls': true,
            'typescript.validate.enable': true,
        };

        return monaco.editor.create(
            container, 
            { ...defaultOptions, ...options }
        );
    },

    // 加载类型定义
    async loadTypeDefinitions(typesContent) {
        // 添加额外的TypeScript库
        monaco.languages.typescript.typescriptDefaults.addExtraLib(
            typesContent,
            'file:///ui_types.d.ts'
        );

        console.log('Type definitions loaded');
    },

    // 配置TypeScript编译选项
    configureTypeScript() {
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ES2020,
            allowNonTsExtensions: true,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            module: monaco.languages.typescript.ModuleKind.CommonJS,
            noEmit: true,
            esModuleInterop: true,
            jsx: monaco.languages.typescript.JsxEmit.React,
            reactNamespace: 'React',
            allowJs: true,
            typeRoots: ['node_modules/@types']
        });

        // 配置诊断选项
        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: false,
            noSyntaxValidation: false,
            onlyVisible: false
        });
    },

    // 获取错误和警告
    async getMarkers(model) {
        const markers = monaco.editor.getModelMarkers({ 
            resource: model.uri 
        });

        const errors = markers.filter(m => m.severity === monaco.MarkerSeverity.Error);
        const warnings = markers.filter(m => m.severity === monaco.MarkerSeverity.Warning);

        return { errors, warnings, markers };
    }
};
