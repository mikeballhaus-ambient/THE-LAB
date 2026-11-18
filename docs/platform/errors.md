

=== LINT ERRORS FOR FILE: src/apps/task-list/front-end/components/TaskForm.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\task-list\front-end\components\TaskForm.vue
    6:8  error  'Badge' is defined but never used            @typescript-eslint/no-unused-vars
  121:7  error  'addTag' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)

Debugger attached.
Debugger attached.
Waiting for the debugger to disconnect...
Waiting for the debugger to disconnect...


=== LINT ERRORS FOR FILE: src/apps/task-list/front-end/components/TaskForm.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\task-list\front-end\components\TaskForm.vue
    6:8  error  'Badge' is defined but never used                        @typescript-eslint/no-unused-vars
   56:9  error  'trimmedDescription' is assigned a value but never used  @typescript-eslint/no-unused-vars
  176:7  error  'addTag' is assigned a value but never used              @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)

Debugger attached.
Debugger attached.
Waiting for the debugger to disconnect...
Waiting for the debugger to disconnect...


=== LINT ERRORS FOR FILE: src/apps/task-list/front-end/components/TaskForm.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\task-list\front-end\components\TaskForm.vue
   55:9  error  'trimmedDescription' is assigned a value but never used  @typescript-eslint/no-unused-vars
  175:7  error  'addTag' is assigned a value but never used              @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)

Debugger attached.
Debugger attached.
Waiting for the debugger to disconnect...
Waiting for the debugger to disconnect...


=== LINT ERRORS FOR FILE: src/apps/task-list/front-end/components/TaskForm.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\task-list\front-end\components\TaskForm.vue
  174:7  error  'addTag' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)

Debugger attached.
Debugger attached.
Waiting for the debugger to disconnect...
Waiting for the debugger to disconnect...


=== TYPE ERRORS FOR FILE: src/apps/task-list/front-end/components/TaskForm.vue ===
src/apps/task-list/front-end/components/TaskForm.vue(126,14): error TS2304: Cannot find name 'trimmedTitle'.
src/apps/task-list/front-end/components/TaskForm.vue(130,16): error TS2304: Cannot find name 'isValid'.
src/apps/task-list/front-end/components/TaskForm.vue(131,19): error TS2304: Cannot find name 'isValid'.
src/apps/task-list/front-end/components/TaskForm.vue(131,30): error TS2304: Cannot find name 'trimmedAssignee'.
src/apps/task-list/front-end/components/TaskForm.vue(131,60): error TS2304: Cannot find name 'trimmedAssignee'.
src/apps/task-list/front-end/components/TaskForm.vue(132,13): error TS2304: Cannot find name 'isValid'.


=== LINT ERRORS FOR FILE: src/apps/task-list/front-end/components/TaskForm.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\task-list\front-end\components\TaskForm.vue
  38:5  error  'trimmedTitle' is never reassigned. Use 'const' instead     prefer-const
  39:5  error  'trimmedAssignee' is never reassigned. Use 'const' instead  prefer-const
  40:5  error  'isValid' is never reassigned. Use 'const' instead          prefer-const

✖ 3 problems (3 errors, 0 warnings)
  3 errors and 0 warnings potentially fixable with the `--fix` option.

Debugger attached.
Debugger attached.
Waiting for the debugger to disconnect...
Waiting for the debugger to disconnect...


=== TYPE ERRORS FOR FILE: src/apps/task-list/front-end/components/TaskForm.vue ===
src/apps/task-list/front-end/components/TaskForm.vue(129,14): error TS2304: Cannot find name 'trimmedTitle'.
src/apps/task-list/front-end/components/TaskForm.vue(133,16): error TS2304: Cannot find name 'isValid'.
src/apps/task-list/front-end/components/TaskForm.vue(134,19): error TS2304: Cannot find name 'isValid'.
src/apps/task-list/front-end/components/TaskForm.vue(134,30): error TS2304: Cannot find name 'trimmedAssignee'.
src/apps/task-list/front-end/components/TaskForm.vue(134,60): error TS2304: Cannot find name 'trimmedAssignee'.
src/apps/task-list/front-end/components/TaskForm.vue(135,13): error TS2304: Cannot find name 'isValid'.


=== LINT ERRORS FOR FILE: src/apps/task-list/front-end/components/TaskForm.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\task-list\front-end\components\TaskForm.vue
  38:7  error  'isValidRef' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)

Debugger attached.
Debugger attached.
Waiting for the debugger to disconnect...
Waiting for the debugger to disconnect...


=== TYPE ERRORS FOR FILE: src/apps/forms-builder/front-end/stores/formStore.ts ===
src/apps/forms-builder/front-end/stores/formStore.ts(80,7): error TS2322: Type '{ formKey: string; name: string; description: string; createdAt: string; updatedAt: string; } | null' is not assignable to type '{ formKey: string; name: string; description: string; components_json: string; validation_rules: ValidationRules; createdAt: string; updatedAt: string; } | null'.


=== TYPE ERRORS FOR FILE: src/apps/forms-builder/front-end/stores/websocketStore.ts ===
src/apps/forms-builder/front-end/stores/websocketStore.ts(54,15): error TS2304: Cannot find name 'SocketEvent'.
src/apps/forms-builder/front-end/stores/websocketStore.ts(67,16): error TS2304: Cannot find name 'SocketEvent'.
src/apps/forms-builder/front-end/stores/websocketStore.ts(74,17): error TS2304: Cannot find name 'SocketEvent'.
src/apps/forms-builder/front-end/stores/websocketStore.ts(78,35): error TS2353: Object literal may only specify known properties, and 'data' does not exist in type '{ event: SocketEvent; payload?: any; timestamp: number; }'.
src/apps/forms-builder/front-end/stores/websocketStore.ts(79,41): error TS2353: Object literal may only specify known properties, and 'data' does not exist in type '{ event: SocketEvent; payload?: any; timestamp: number; }'.


=== TYPE ERRORS FOR FILE: src/apps/forms-builder/front-end/App.vue ===
src/apps/forms-builder/front-end/App.vue(228,7): error TS2322: Type 'import("c:/Users/mikeb/source/repos/LLM_Workspace/the-lab/src/apps/lab-formsbuilder/front-end/types/index").ValidationRules' is not assignable to type 'import("c:/Users/mikeb/source/repos/LLM_Workspace/the-lab/src/apps/lab-formsbuilder/shared/types/form-types").ValidationRules'.
src/apps/forms-builder/front-end/App.vue(253,7): error TS2322: Type 'import("c:/Users/mikeb/source/repos/LLM_Workspace/the-lab/src/apps/lab-formsbuilder/front-end/types/index").ValidationRules' is not assignable to type 'import("c:/Users/mikeb/source/repos/LLM_Workspace/the-lab/src/apps/lab-formsbuilder/shared/types/form-types").ValidationRules'.
src/apps/forms-builder/front-end/App.vue(385,26): error TS2322: Type '{ formKey: string; name: string; description: string; createdAt: string; updatedAt: string; }[]' is not assignable to type 'FormListItem[]'.
src/apps/forms-builder/front-end/App.vue(429,30): error TS2322: Type '{ id: string; name: string; appName: string; entityName: string; endpoints: { create: string; read: string; update: string; delete: string; }; capabilities: ("CRUD" | "Lookups" | "Search" | "Batch")[]; createdAt: string; updatedAt: string; }[]' is not assignable to type 'Connector[]'.
src/apps/forms-builder/front-end/App.vue(452,28): error TS2322: Type '{ id: string; name: string; appName: string; entityName: string; endpoints: { create: string; read: string; update: string; delete: string; }; capabilities: ("CRUD" | "Lookups" | "Search" | "Batch")[]; createdAt: string; updatedAt: string; }[]' is not assignable to type 'Connector[]'.
src/apps/forms-builder/front-end/App.vue(465,61): error TS2322: Type '{ id: string; name: string; appName: string; entityName: string; endpoints: { create: string; read: string; update: string; delete: string; }; capabilities: ("CRUD" | "Lookups" | "Search" | "Batch")[]; createdAt: string; updatedAt: string; }[]' is not assignable to type 'Connector[]'.
src/apps/forms-builder/front-end/App.vue(468,20): error TS2322: Type '{ formKey: string; name: string; description: string; createdAt: string; updatedAt: string; }[]' is not assignable to type 'FormListItem[]'.
src/apps/forms-builder/front-end/App.vue(498,33): error TS2322: Type '{ formKey: string; name: string; description: string; createdAt: string; updatedAt: string; }[]' is not assignable to type 'FormListItem[]'.


=== TYPE ERRORS FOR FILE: src/apps/forms-builder/front-end/stores/websocketStore.ts ===
src/apps/forms-builder/front-end/stores/websocketStore.ts(78,35): error TS2353: Object literal may only specify known properties, and 'data' does not exist in type '{ event: SocketEvent; payload?: any; timestamp: number; }'.
src/apps/forms-builder/front-end/stores/websocketStore.ts(79,41): error TS2353: Object literal may only specify known properties, and 'data' does not exist in type '{ event: SocketEvent; payload?: any; timestamp: number; }'.


=== TYPE ERRORS FOR FILE: src/apps/forms-builder/front-end/App.vue ===
src/apps/forms-builder/front-end/App.vue(130,3): error TS2322: Type '{ formKey: string; name: string; description: string; components_json: string; validation_rules: ValidationRules; }' is not assignable to type 'FormSchema | { formKey: string; name: string; description: string; components_json: string; validation_rules: ValidationRules; createdAt: string; updatedAt: string; }'.
src/apps/forms-builder/front-end/App.vue(229,44): error TS2339: Property 'components' does not exist on type 'FormSchema'.
src/apps/forms-builder/front-end/App.vue(230,30): error TS2339: Property 'validation' does not exist on type 'FormSchema'.
src/apps/forms-builder/front-end/App.vue(254,44): error TS2339: Property 'components' does not exist on type 'FormSchema'.
src/apps/forms-builder/front-end/App.vue(255,30): error TS2339: Property 'validation' does not exist on type 'FormSchema'.
src/apps/forms-builder/front-end/App.vue(278,29): error TS2339: Property 'components' does not exist on type '{ formKey: string; name: string; description: string; components_json: string; validation_rules: ValidationRules; createdAt: string; updatedAt: string; }'.
src/apps/forms-builder/front-end/App.vue(285,29): error TS2339: Property 'components' does not exist on type '{ formKey: string; name: string; description: string; components_json: string; validation_rules: ValidationRules; createdAt: string; updatedAt: string; }'.
src/apps/forms-builder/front-end/App.vue(285,66): error TS2339: Property 'components' does not exist on type '{ formKey: string; name: string; description: string; components_json: string; validation_rules: ValidationRules; createdAt: string; updatedAt: string; }'.
src/apps/forms-builder/front-end/App.vue(286,7): error TS7006: Parameter 'c' implicitly has an 'any' type.
src/apps/forms-builder/front-end/App.vue(295,43): error TS2339: Property 'components' does not exist on type '{ formKey: string; name: string; description: string; components_json: string; validation_rules: ValidationRules; createdAt: string; updatedAt: string; }'.
src/apps/forms-builder/front-end/App.vue(296,7): error TS7006: Parameter 'c' implicitly has an 'any' type.
src/apps/forms-builder/front-end/App.vue(299,31): error TS2339: Property 'components' does not exist on type '{ formKey: string; name: string; description: string; components_json: string; validation_rules: ValidationRules; createdAt: string; updatedAt: string; }'.
src/apps/forms-builder/front-end/App.vue(317,43): error TS2339: Property 'components' does not exist on type '{ formKey: string; name: string; description: string; components_json: string; validation_rules: ValidationRules; createdAt: string; updatedAt: string; }'.
src/apps/forms-builder/front-end/App.vue(318,7): error TS7006: Parameter 'c' implicitly has an 'any' type.
src/apps/forms-builder/front-end/App.vue(321,31): error TS2339: Property 'components' does not exist on type '{ formKey: string; name: string; description: string; components_json: string; validation_rules: ValidationRules; createdAt: string; updatedAt: string; }'.
src/apps/forms-builder/front-end/App.vue(387,95): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(388,47): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(388,69): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(431,30): error TS2322: Type '{ id: string; name: string; appName: string; entityName: string; endpoints: { create: string; read: string; update: string; delete: string; }; capabilities: ("CRUD" | "Lookups" | "Search" | "Batch")[]; createdAt: string; updatedAt: string; }[]' is not assignable to type 'Connector[]'.
src/apps/forms-builder/front-end/App.vue(454,28): error TS2322: Type '{ id: string; name: string; appName: string; entityName: string; endpoints: { create: string; read: string; update: string; delete: string; }; capabilities: ("CRUD" | "Lookups" | "Search" | "Batch")[]; createdAt: string; updatedAt: string; }[]' is not assignable to type 'Connector[]'.
src/apps/forms-builder/front-end/App.vue(467,12): error TS2741: Property 'value' is missing in type '{ fieldKey: string; label: string; type: "number" | "text" | "email" | "password" | "textarea" | "select" | "checkbox" | "radio" | "date" | "file"; required: boolean; placeholder?: string | undefined; options?: { ...; }[] | undefined; validation?: { ...; } | undefined; }' but required in type 'FormComponent'.
src/apps/forms-builder/front-end/App.vue(467,61): error TS2322: Type '{ id: string; name: string; appName: string; entityName: string; endpoints: { create: string; read: string; update: string; delete: string; }; capabilities: ("CRUD" | "Lookups" | "Search" | "Batch")[]; createdAt: string; updatedAt: string; }[]' is not assignable to type 'Connector[]'.
src/apps/forms-builder/front-end/App.vue(470,89): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(471,41): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(471,63): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(484,63): error TS2339: Property 'components' does not exist on type '{ formKey: string; name: string; description: string; components_json: string; validation_rules: ValidationRules; createdAt: string; updatedAt: string; }'.


=== TYPE ERRORS FOR FILE: src/apps/forms-builder/front-end/App.vue ===
src/apps/forms-builder/front-end/App.vue(229,44): error TS2339: Property 'components' does not exist on type 'FormSchema'.
src/apps/forms-builder/front-end/App.vue(230,30): error TS2339: Property 'validation' does not exist on type 'FormSchema'.
src/apps/forms-builder/front-end/App.vue(254,44): error TS2339: Property 'components' does not exist on type 'FormSchema'.
src/apps/forms-builder/front-end/App.vue(255,30): error TS2339: Property 'validation' does not exist on type 'FormSchema'.
src/apps/forms-builder/front-end/App.vue(278,29): error TS2339: Property 'components' does not exist on type '{ formKey?: string | undefined; name?: string | undefined; description?: string | undefined; components_json?: string | undefined; validation_rules?: ValidationRules | undefined; createdAt?: string | undefined; updatedAt?: string | undefined; }'.
src/apps/forms-builder/front-end/App.vue(285,29): error TS2339: Property 'components' does not exist on type '{ formKey?: string | undefined; name?: string | undefined; description?: string | undefined; components_json?: string | undefined; validation_rules?: ValidationRules | undefined; createdAt?: string | undefined; updatedAt?: string | undefined; }'.
src/apps/forms-builder/front-end/App.vue(285,66): error TS2339: Property 'components' does not exist on type '{ formKey?: string | undefined; name?: string | undefined; description?: string | undefined; components_json?: string | undefined; validation_rules?: ValidationRules | undefined; createdAt?: string | undefined; updatedAt?: string | undefined; }'.
src/apps/forms-builder/front-end/App.vue(286,7): error TS7006: Parameter 'c' implicitly has an 'any' type.
src/apps/forms-builder/front-end/App.vue(295,43): error TS2339: Property 'components' does not exist on type '{ formKey?: string | undefined; name?: string | undefined; description?: string | undefined; components_json?: string | undefined; validation_rules?: ValidationRules | undefined; createdAt?: string | undefined; updatedAt?: string | undefined; }'.
src/apps/forms-builder/front-end/App.vue(296,7): error TS7006: Parameter 'c' implicitly has an 'any' type.
src/apps/forms-builder/front-end/App.vue(299,31): error TS2339: Property 'components' does not exist on type '{ formKey?: string | undefined; name?: string | undefined; description?: string | undefined; components_json?: string | undefined; validation_rules?: ValidationRules | undefined; createdAt?: string | undefined; updatedAt?: string | undefined; }'.
src/apps/forms-builder/front-end/App.vue(317,43): error TS2339: Property 'components' does not exist on type '{ formKey?: string | undefined; name?: string | undefined; description?: string | undefined; components_json?: string | undefined; validation_rules?: ValidationRules | undefined; createdAt?: string | undefined; updatedAt?: string | undefined; }'.
src/apps/forms-builder/front-end/App.vue(318,7): error TS7006: Parameter 'c' implicitly has an 'any' type.
src/apps/forms-builder/front-end/App.vue(321,31): error TS2339: Property 'components' does not exist on type '{ formKey?: string | undefined; name?: string | undefined; description?: string | undefined; components_json?: string | undefined; validation_rules?: ValidationRules | undefined; createdAt?: string | undefined; updatedAt?: string | undefined; }'.
src/apps/forms-builder/front-end/App.vue(387,95): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(388,47): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(388,69): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(431,30): error TS2322: Type '{ id: string; name: string; appName: string; entityName: string; endpoints: { create: string; read: string; update: string; delete: string; }; capabilities: ("CRUD" | "Lookups" | "Search" | "Batch")[]; createdAt: string; updatedAt: string; }[]' is not assignable to type 'Connector[]'.
src/apps/forms-builder/front-end/App.vue(454,28): error TS2322: Type '{ id: string; name: string; appName: string; entityName: string; endpoints: { create: string; read: string; update: string; delete: string; }; capabilities: ("CRUD" | "Lookups" | "Search" | "Batch")[]; createdAt: string; updatedAt: string; }[]' is not assignable to type 'Connector[]'.
src/apps/forms-builder/front-end/App.vue(467,12): error TS2741: Property 'value' is missing in type '{ fieldKey: string; label: string; type: "number" | "text" | "email" | "password" | "textarea" | "select" | "checkbox" | "radio" | "date" | "file"; required: boolean; placeholder?: string | undefined; options?: { ...; }[] | undefined; validation?: { ...; } | undefined; }' but required in type 'FormComponent'.
src/apps/forms-builder/front-end/App.vue(467,61): error TS2322: Type '{ id: string; name: string; appName: string; entityName: string; endpoints: { create: string; read: string; update: string; delete: string; }; capabilities: ("CRUD" | "Lookups" | "Search" | "Batch")[]; createdAt: string; updatedAt: string; }[]' is not assignable to type 'Connector[]'.
src/apps/forms-builder/front-end/App.vue(470,89): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(471,41): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(471,63): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(484,63): error TS2339: Property 'components' does not exist on type '{ formKey?: string | undefined; name?: string | undefined; description?: string | undefined; components_json?: string | undefined; validation_rules?: ValidationRules | undefined; createdAt?: string | undefined; updatedAt?: string | undefined; }'.


=== TYPE ERRORS FOR FILE: src/apps/forms-builder/front-end/App.vue ===
src/apps/forms-builder/front-end/App.vue(114,3): error TS2353: Object literal may only specify known properties, and 'validation_rules' does not exist in type 'CanvasFormSchema'.
src/apps/forms-builder/front-end/App.vue(132,5): error TS2561: Object literal may only specify known properties, but 'components_json' does not exist in type 'CanvasFormSchema | { formKey?: string | undefined; name: string; description?: string | undefined; components: { fieldKey: string; label: string; type: "number" | "text" | ... 7 more ... | "file"; required: boolean; placeholder?: string | undefined; options?: { ...; }[] | undefined; validation?: { ...; } | undefined...'. Did you mean to write 'components'?
src/apps/forms-builder/front-end/App.vue(222,40): error TS2304: Cannot find name 'FormSchema'.
src/apps/forms-builder/front-end/App.vue(245,40): error TS2304: Cannot find name 'FormSchema'.
src/apps/forms-builder/front-end/App.vue(385,95): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(386,47): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(386,69): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(429,30): error TS2322: Type '{ id: string; name: string; appName: string; entityName: string; endpoints: { create: string; read: string; update: string; delete: string; }; capabilities: ("CRUD" | "Lookups" | "Search" | "Batch")[]; createdAt: string; updatedAt: string; }[]' is not assignable to type 'Connector[]'.
src/apps/forms-builder/front-end/App.vue(452,28): error TS2322: Type '{ id: string; name: string; appName: string; entityName: string; endpoints: { create: string; read: string; update: string; delete: string; }; capabilities: ("CRUD" | "Lookups" | "Search" | "Batch")[]; createdAt: string; updatedAt: string; }[]' is not assignable to type 'Connector[]'.
src/apps/forms-builder/front-end/App.vue(465,12): error TS2741: Property 'value' is missing in type '{ fieldKey: string; label: string; type: "number" | "text" | "email" | "password" | "textarea" | "select" | "checkbox" | "radio" | "date" | "file"; required: boolean; placeholder?: string | undefined; options?: { ...; }[] | undefined; validation?: { ...; } | undefined; }' but required in type 'FormComponent'.
src/apps/forms-builder/front-end/App.vue(465,61): error TS2322: Type '{ id: string; name: string; appName: string; entityName: string; endpoints: { create: string; read: string; update: string; delete: string; }; capabilities: ("CRUD" | "Lookups" | "Search" | "Batch")[]; createdAt: string; updatedAt: string; }[]' is not assignable to type 'Connector[]'.
src/apps/forms-builder/front-end/App.vue(468,89): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(469,41): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(469,63): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(482,63): error TS2339: Property 'components' does not exist on type '{ formKey?: string | undefined; name?: string | undefined; description?: string | undefined; components_json?: string | undefined; validation_rules?: ValidationRules | undefined; createdAt?: string | undefined; updatedAt?: string | undefined; }'.


=== TYPE ERRORS FOR FILE: src/apps/forms-builder/front-end/App.vue ===
src/apps/forms-builder/front-end/App.vue(114,3): error TS2353: Object literal may only specify known properties, and 'validation_rules' does not exist in type 'CanvasFormSchema'.
src/apps/forms-builder/front-end/App.vue(132,5): error TS2561: Object literal may only specify known properties, but 'components_json' does not exist in type 'CanvasFormSchema | { formKey?: string | undefined; name: string; description?: string | undefined; components: { fieldKey: string; label: string; type: "number" | "text" | ... 7 more ... | "file"; required: boolean; placeholder?: string | undefined; options?: { ...; }[] | undefined; validation?: { ...; } | undefined...'. Did you mean to write 'components'?
src/apps/forms-builder/front-end/App.vue(222,40): error TS2304: Cannot find name 'FormSchema'.
src/apps/forms-builder/front-end/App.vue(245,40): error TS2304: Cannot find name 'FormSchema'.
src/apps/forms-builder/front-end/App.vue(385,95): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(386,47): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(386,69): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(429,30): error TS2322: Type '{ id: string; name: string; appName: string; entityName: string; endpoints: { create: string; read: string; update: string; delete: string; }; capabilities: ("CRUD" | "Lookups" | "Search" | "Batch")[]; createdAt: string; updatedAt: string; }[]' is not assignable to type 'Connector[]'.
src/apps/forms-builder/front-end/App.vue(452,28): error TS2322: Type '{ id: string; name: string; appName: string; entityName: string; endpoints: { create: string; read: string; update: string; delete: string; }; capabilities: ("CRUD" | "Lookups" | "Search" | "Batch")[]; createdAt: string; updatedAt: string; }[]' is not assignable to type 'Connector[]'.
src/apps/forms-builder/front-end/App.vue(465,12): error TS2741: Property 'value' is missing in type '{ fieldKey: string; label: string; type: "number" | "text" | "email" | "password" | "textarea" | "select" | "checkbox" | "radio" | "date" | "file"; required: boolean; placeholder?: string | undefined; options?: { ...; }[] | undefined; validation?: { ...; } | undefined; }' but required in type 'FormComponent'.
src/apps/forms-builder/front-end/App.vue(465,61): error TS2322: Type '{ id: string; name: string; appName: string; entityName: string; endpoints: { create: string; read: string; update: string; delete: string; }; capabilities: ("CRUD" | "Lookups" | "Search" | "Batch")[]; createdAt: string; updatedAt: string; }[]' is not assignable to type 'Connector[]'.
src/apps/forms-builder/front-end/App.vue(468,89): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(469,41): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(469,63): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(482,63): error TS2339: Property 'components' does not exist on type '{ formKey?: string | undefined; name?: string | undefined; description?: string | undefined; components_json?: string | undefined; validation_rules?: ValidationRules | undefined; createdAt?: string | undefined; updatedAt?: string | undefined; }'.


=== TYPE ERRORS FOR FILE: src/apps/forms-builder/front-end/App.vue ===
src/apps/forms-builder/front-end/App.vue(18,44): error TS2724: '"@/apps/lab-formsbuilder/shared/types"' has no exported member named 'ApiFormSchema'. Did you mean 'FormSchema'?
src/apps/forms-builder/front-end/App.vue(103,7): error TS2451: Cannot redeclare block-scoped variable 'showPreviewModal'.
src/apps/forms-builder/front-end/App.vue(104,7): error TS2451: Cannot redeclare block-scoped variable 'previewSchema'.
src/apps/forms-builder/front-end/App.vue(107,7): error TS2451: Cannot redeclare block-scoped variable 'selectedComponentForEditor'.
src/apps/forms-builder/front-end/App.vue(119,10): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(124,16): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(138,16): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(146,10): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(151,10): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(158,10): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(165,10): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(171,16): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(186,16): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(194,16): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(216,10): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(222,16): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(245,16): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(267,16): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(272,10): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(280,10): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(289,10): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(305,23): error TS2345: Argument of type '"connectors-loaded"' is not assignable to parameter of type 'SocketEvent'.
src/apps/forms-builder/front-end/App.vue(310,23): error TS2345: Argument of type '"connectors-error"' is not assignable to parameter of type 'SocketEvent'.
src/apps/forms-builder/front-end/App.vue(343,7): error TS2451: Cannot redeclare block-scoped variable 'selectedComponentForEditor'.
src/apps/forms-builder/front-end/App.vue(346,10): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(351,16): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(365,16): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(373,10): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(378,10): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(385,10): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(392,10): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(398,16): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(413,16): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(421,16): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(443,10): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(449,16): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(472,16): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(494,16): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(499,10): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(507,10): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(516,10): error TS2393: Duplicate function implementation.
src/apps/forms-builder/front-end/App.vue(530,7): error TS2451: Cannot redeclare block-scoped variable 'showPreviewModal'.
src/apps/forms-builder/front-end/App.vue(531,7): error TS2451: Cannot redeclare block-scoped variable 'previewSchema'.
src/apps/forms-builder/front-end/App.vue(560,15): error TS2339: Property 'loadingForms' does not exist on type '{ errorState: { hasError: boolean; message: string; timestamp: number; }; currentView: "landing" | "forms-management" | "form-designer"; loadedForms: { formKey: string; name: string; description: string; components_json: string; validation_rules: ValidationRules; createdAt: string; updatedAt: string; }[]; ... 46 mor...'.
src/apps/forms-builder/front-end/App.vue(577,14): error TS2322: Type '(form: FormListItem) => { new (executor: (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => void): Promise<void>; ... 9 more ...; readonly [Symbol.species]: PromiseConstructor; }' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(578,14): error TS2322: Type '(form: FormListItem) => { new (executor: (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => void): Promise<void>; ... 9 more ...; readonly [Symbol.species]: PromiseConstructor; }' is not assignable to type '() => void'.
src/apps/forms-builder/front-end/App.vue(579,14): error TS2322: Type '(form: FormListItem) => { new (executor: (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => void): Promise<void>; ... 9 more ...; readonly [Symbol.species]: PromiseConstructor; }' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(580,14): error TS2322: Type '(form: FormListItem) => { new (executor: (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => void): Promise<void>; ... 9 more ...; readonly [Symbol.species]: PromiseConstructor; }' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(587,15): error TS2551: Property 'loadingConnectors' does not exist on type '{ errorState: { hasError: boolean; message: string; timestamp: number; }; currentView: "landing" | "forms-management" | "form-designer"; loadedForms: { formKey: string; name: string; description: string; components_json: string; validation_rules: ValidationRules; createdAt: string; updatedAt: string; }[]; ... 46 mor...'. Did you mean 'loadedConnectors'?
src/apps/forms-builder/front-end/App.vue(601,14): error TS2322: Type '{ id: string; name: string; appName: string; entityName: string; endpoints: { create: string; read: string; update: string; delete: string; }; capabilities: ("CRUD" | "Lookups" | "Search" | "Batch")[]; createdAt: string; updatedAt: string; }[]' is not assignable to type 'Connector[]'.
src/apps/forms-builder/front-end/App.vue(614,10): error TS2322: Type '(form: FormListItem) => { new (executor: (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => void): Promise<void>; ... 9 more ...; readonly [Symbol.species]: PromiseConstructor; }' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(615,10): error TS2322: Type '(form: FormListItem) => { new (executor: (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => void): Promise<void>; ... 9 more ...; readonly [Symbol.species]: PromiseConstructor; }' is not assignable to type '() => void'.
src/apps/forms-builder/front-end/App.vue(616,10): error TS2322: Type '(form: FormListItem) => { new (executor: (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => void): Promise<void>; ... 9 more ...; readonly [Symbol.species]: PromiseConstructor; }' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(617,10): error TS2322: Type '(form: FormListItem) => { new (executor: (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => void): Promise<void>; ... 9 more ...; readonly [Symbol.species]: PromiseConstructor; }' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(630,8): error TS2345: Argument of type '{ fieldName: string; fieldKey: string; }' is not assignable to parameter of type '{ readonly selectedComponent: FormComponent | null; readonly connectors: Connector[]; readonly onUpdate?: ((component: FormComponent) => any) | undefined; } & VNodeProps & AllowedComponentProps & ComponentCustomProps & Record<...>'.
src/apps/forms-builder/front-end/App.vue(636,10): error TS2322: Type '{ id: string; name: string; appName: string; entityName: string; endpoints: { create: string; read: string; update: string; delete: string; }; capabilities: ("CRUD" | "Lookups" | "Search" | "Batch")[]; createdAt: string; updatedAt: string; }[]' is not assignable to type 'Connector[]'.
src/apps/forms-builder/front-end/App.vue(737,6): error TS2345: Argument of type '{ onError: any; onSubmission: any; }' is not assignable to parameter of type '{ readonly forms: FormListItem[]; readonly showDetails?: boolean | undefined; readonly "onSubmission-added"?: ((submission: Submission) => any) | undefined; } & VNodeProps & AllowedComponentProps & ComponentCustomProps & Record<...>'.


=== TYPE ERRORS FOR FILE: src/apps/forms-builder/front-end/App.vue ===
src/apps/forms-builder/front-end/App.vue(227,44): error TS2339: Property 'components' does not exist on type 'FormSchema'.
src/apps/forms-builder/front-end/App.vue(252,44): error TS2339: Property 'components' does not exist on type 'FormSchema'.
src/apps/forms-builder/front-end/App.vue(305,23): error TS2345: Argument of type '"connectors-loaded"' is not assignable to parameter of type 'SocketEvent'.
src/apps/forms-builder/front-end/App.vue(310,23): error TS2345: Argument of type '"connectors-error"' is not assignable to parameter of type 'SocketEvent'.
src/apps/forms-builder/front-end/App.vue(379,14): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(381,14): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(382,14): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(398,14): error TS2322: Type '{ id: string; name: string; appName: string; entityName: string; endpoints: { create: string; read: string; update: string; delete: string; }; capabilities: ("CRUD" | "Lookups" | "Search" | "Batch")[]; createdAt: string; updatedAt: string; }[]' is not assignable to type 'Connector[]'.
src/apps/forms-builder/front-end/App.vue(411,10): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(413,10): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(414,10): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(428,10): error TS2322: Type '{ fieldKey: string; label: string; type: "number" | "text" | "email" | "password" | "textarea" | "select" | "checkbox" | "radio" | "date" | "file"; required: boolean; placeholder?: string | undefined; options?: { ...; }[] | undefined; validation?: { ...; } | undefined; } | null' is not assignable to type 'FormComponent | null'.
src/apps/forms-builder/front-end/App.vue(429,10): error TS2322: Type '{ id: string; name: string; appName: string; entityName: string; endpoints: { create: string; read: string; update: string; delete: string; }; capabilities: ("CRUD" | "Lookups" | "Search" | "Batch")[]; createdAt: string; updatedAt: string; }[]' is not assignable to type 'Connector[]'.
src/apps/forms-builder/front-end/App.vue(431,43): error TS2339: Property 'value' does not exist on type '{ formKey?: string | undefined; name: string; description?: string | undefined; components: { fieldKey: string; label: string; type: "number" | "text" | "email" | "password" | "textarea" | ... 4 more ... | "file"; required: boolean; placeholder?: string | undefined; options?: { ...; }[] | undefined; validation?: { ....'.
src/apps/forms-builder/front-end/App.vue(432,13): error TS7006: Parameter 'c' implicitly has an 'any' type.
src/apps/forms-builder/front-end/App.vue(435,31): error TS2339: Property 'value' does not exist on type '{ formKey?: string | undefined; name: string; description?: string | undefined; components: { fieldKey: string; label: string; type: "number" | "text" | "email" | "password" | "textarea" | ... 4 more ... | "file"; required: boolean; placeholder?: string | undefined; options?: { ...; }[] | undefined; validation?: { ....'.
src/apps/forms-builder/front-end/App.vue(441,10): error TS2322: Type '{ id: string; name: string; appName: string; entityName: string; endpoints: { create: string; read: string; update: string; delete: string; }; capabilities: ("CRUD" | "Lookups" | "Search" | "Batch")[]; createdAt: string; updatedAt: string; }[]' is not assignable to type 'Connector[]'.


=== TYPE ERRORS FOR FILE: src/apps/forms-builder/front-end/App.vue ===
src/apps/forms-builder/front-end/App.vue(114,3): error TS2353: Object literal may only specify known properties, and 'validation' does not exist in type 'CanvasFormSchema'.
src/apps/forms-builder/front-end/App.vue(133,5): error TS2353: Object literal may only specify known properties, and 'validation' does not exist in type 'CanvasFormSchema | { formKey?: string | undefined; name: string; description?: string | undefined; components: { fieldKey: string; label: string; type: "number" | "text" | ... 7 more ... | "file"; required: boolean; placeholder?: string | undefined; options?: { ...; }[] | undefined; validation?: { ...; } | undefined...'.
src/apps/forms-builder/front-end/App.vue(305,23): error TS1361: 'SOCKET_EVENTS' cannot be used as a value because it was imported using 'import type'.
src/apps/forms-builder/front-end/App.vue(305,37): error TS2339: Property 'CONNECTOR_LOADED' does not exist on type '{ readonly FORMS_LIST_REQUEST: "forms-list-request"; readonly FORMS_LIST_RESPONSE: "forms-list-response"; readonly FORM_CREATED: "form-created"; readonly FORM_UPDATED: "form-updated"; ... 4 more ...; readonly SUCCESS: "success"; }'.
src/apps/forms-builder/front-end/App.vue(310,23): error TS1361: 'SOCKET_EVENTS' cannot be used as a value because it was imported using 'import type'.
src/apps/forms-builder/front-end/App.vue(379,14): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(381,14): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(382,14): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(398,14): error TS2322: Type '{ id: string; name: string; appName: string; entityName: string; endpoints: { create: string; read: string; update: string; delete: string; }; capabilities: ("CRUD" | "Lookups" | "Search" | "Batch")[]; createdAt: string; updatedAt: string; }[]' is not assignable to type 'Connector[]'.
src/apps/forms-builder/front-end/App.vue(411,10): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(413,10): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(414,10): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(428,10): error TS2322: Type '{ fieldKey: string; label: string; type: "number" | "text" | "email" | "password" | "textarea" | "select" | "checkbox" | "radio" | "date" | "file"; required: boolean; placeholder?: string | undefined; options?: { ...; }[] | undefined; validation?: { ...; } | undefined; } | null' is not assignable to type 'FormComponent | null'.
src/apps/forms-builder/front-end/App.vue(429,10): error TS2322: Type '{ id: string; name: string; appName: string; entityName: string; endpoints: { create: string; read: string; update: string; delete: string; }; capabilities: ("CRUD" | "Lookups" | "Search" | "Batch")[]; createdAt: string; updatedAt: string; }[]' is not assignable to type 'Connector[]'.
src/apps/forms-builder/front-end/App.vue(431,43): error TS2339: Property 'value' does not exist on type '{ formKey?: string | undefined; name: string; description?: string | undefined; components: { fieldKey: string; label: string; type: "number" | "text" | "email" | "password" | "textarea" | ... 4 more ... | "file"; required: boolean; placeholder?: string | undefined; options?: { ...; }[] | undefined; validation?: { ....'.
src/apps/forms-builder/front-end/App.vue(432,13): error TS7006: Parameter 'c' implicitly has an 'any' type.
src/apps/forms-builder/front-end/App.vue(435,31): error TS2339: Property 'value' does not exist on type '{ formKey?: string | undefined; name: string; description?: string | undefined; components: { fieldKey: string; label: string; type: "number" | "text" | "email" | "password" | "textarea" | ... 4 more ... | "file"; required: boolean; placeholder?: string | undefined; options?: { ...; }[] | undefined; validation?: { ....'.
src/apps/forms-builder/front-end/App.vue(441,10): error TS2322: Type '{ id: string; name: string; appName: string; entityName: string; endpoints: { create: string; read: string; update: string; delete: string; }; capabilities: ("CRUD" | "Lookups" | "Search" | "Batch")[]; createdAt: string; updatedAt: string; }[]' is not assignable to type 'Connector[]'.


=== TYPE ERRORS FOR FILE: src/apps/forms-builder/front-end/App.vue ===
src/apps/forms-builder/front-end/App.vue(114,3): error TS2353: Object literal may only specify known properties, and 'validation' does not exist in type 'CanvasFormSchema'.
src/apps/forms-builder/front-end/App.vue(133,5): error TS2353: Object literal may only specify known properties, and 'validation' does not exist in type 'CanvasFormSchema | { formKey?: string | undefined; name: string; description?: string | undefined; components: { fieldKey: string; label: string; type: "number" | "text" | ... 7 more ... | "file"; required: boolean; placeholder?: string | undefined; options?: { ...; }[] | undefined; validation?: { ...; } | undefined...'.
src/apps/forms-builder/front-end/App.vue(305,23): error TS1361: 'SOCKET_EVENTS' cannot be used as a value because it was imported using 'import type'.
src/apps/forms-builder/front-end/App.vue(305,37): error TS2339: Property 'CONNECTOR_LOADED' does not exist on type '{ readonly FORMS_LIST_REQUEST: "forms-list-request"; readonly FORMS_LIST_RESPONSE: "forms-list-response"; readonly FORM_CREATED: "form-created"; readonly FORM_UPDATED: "form-updated"; ... 4 more ...; readonly SUCCESS: "success"; }'.
src/apps/forms-builder/front-end/App.vue(310,23): error TS1361: 'SOCKET_EVENTS' cannot be used as a value because it was imported using 'import type'.
src/apps/forms-builder/front-end/App.vue(379,14): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(381,14): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(382,14): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(398,14): error TS2322: Type '{ id: string; name: string; appName: string; entityName: string; endpoints: { create: string; read: string; update: string; delete: string; }; capabilities: ("CRUD" | "Lookups" | "Search" | "Batch")[]; createdAt: string; updatedAt: string; }[]' is not assignable to type 'Connector[]'.
src/apps/forms-builder/front-end/App.vue(411,10): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(413,10): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(414,10): error TS2322: Type '(form: FormListItem) => Promise<void>' is not assignable to type '(form: FormListItem) => void'.
src/apps/forms-builder/front-end/App.vue(428,10): error TS2322: Type '{ fieldKey: string; label: string; type: "number" | "text" | "email" | "password" | "textarea" | "select" | "checkbox" | "radio" | "date" | "file"; required: boolean; placeholder?: string | undefined; options?: { ...; }[] | undefined; validation?: { ...; } | undefined; } | null' is not assignable to type 'FormComponent | null'.
src/apps/forms-builder/front-end/App.vue(429,10): error TS2322: Type '{ id: string; name: string; appName: string; entityName: string; endpoints: { create: string; read: string; update: string; delete: string; }; capabilities: ("CRUD" | "Lookups" | "Search" | "Batch")[]; createdAt: string; updatedAt: string; }[]' is not assignable to type 'Connector[]'.
src/apps/forms-builder/front-end/App.vue(431,43): error TS2339: Property 'value' does not exist on type '{ formKey?: string | undefined; name: string; description?: string | undefined; components: { fieldKey: string; label: string; type: "number" | "text" | "email" | "password" | "textarea" | ... 4 more ... | "file"; required: boolean; placeholder?: string | undefined; options?: { ...; }[] | undefined; validation?: { ....'.
src/apps/forms-builder/front-end/App.vue(432,13): error TS7006: Parameter 'c' implicitly has an 'any' type.
src/apps/forms-builder/front-end/App.vue(435,31): error TS2339: Property 'value' does not exist on type '{ formKey?: string | undefined; name: string; description?: string | undefined; components: { fieldKey: string; label: string; type: "number" | "text" | "email" | "password" | "textarea" | ... 4 more ... | "file"; required: boolean; placeholder?: string | undefined; options?: { ...; }[] | undefined; validation?: { ....'.
src/apps/forms-builder/front-end/App.vue(441,10): error TS2322: Type '{ id: string; name: string; appName: string; entityName: string; endpoints: { create: string; read: string; update: string; delete: string; }; capabilities: ("CRUD" | "Lookups" | "Search" | "Batch")[]; createdAt: string; updatedAt: string; }[]' is not assignable to type 'Connector[]'.


=== TYPE ERRORS FOR FILE: src/apps/forms-builder/front-end/App.vue ===
src/apps/forms-builder/front-end/App.vue(114,3): error TS2353: Object literal may only specify known properties, and 'validation' does not exist in type 'CanvasFormSchema'.
src/apps/forms-builder/front-end/App.vue(133,5): error TS2353: Object literal may only specify known properties, and 'validation' does not exist in type 'CanvasFormSchema | { formKey?: string | undefined; name: string; description?: string | undefined; components: { fieldKey: string; label: string; type: "number" | "text" | ... 7 more ... | "file"; required: boolean; placeholder?: string | undefined; options?: { ...; }[] | undefined; validation?: { ...; } | undefined...'.
src/apps/forms-builder/front-end/App.vue(305,23): error TS1361: 'SOCKET_EVENTS' cannot be used as a value because it was imported using 'import type'.
src/apps/forms-builder/front-end/App.vue(305,37): error TS2339: Property 'CONNECTOR_LOADED' does not exist on type '{ readonly FORMS_LIST_REQUEST: "forms-list-request"; readonly FORMS_LIST_RESPONSE: "forms-list-response"; readonly FORM_CREATED: "form-created"; readonly FORM_UPDATED: "form-updated"; ... 4 more ...; readonly SUCCESS: "success"; }'.
src/apps/forms-builder/front-end/App.vue(310,23): error TS1361: 'SOCKET_EVENTS' cannot be used as a value because it was imported using 'import type'.
src/apps/forms-builder/front-end/App.vue(428,10): error TS2322: Type '{ fieldKey: string; label: string; type: "number" | "text" | "email" | "password" | "textarea" | "select" | "checkbox" | "radio" | "date" | "file"; required: boolean; placeholder?: string | undefined; options?: { ...; }[] | undefined; validation?: { ...; } | undefined; } | null' is not assignable to type 'FormComponent | null'.
src/apps/forms-builder/front-end/App.vue(431,43): error TS2339: Property 'value' does not exist on type '{ formKey?: string | undefined; name: string; description?: string | undefined; components: { fieldKey: string; label: string; type: "number" | "text" | "email" | "password" | "textarea" | ... 4 more ... | "file"; required: boolean; placeholder?: string | undefined; options?: { ...; }[] | undefined; validation?: { ....'.
src/apps/forms-builder/front-end/App.vue(432,13): error TS7006: Parameter 'c' implicitly has an 'any' type.
src/apps/forms-builder/front-end/App.vue(435,31): error TS2339: Property 'value' does not exist on type '{ formKey?: string | undefined; name: string; description?: string | undefined; components: { fieldKey: string; label: string; type: "number" | "text" | "email" | "password" | "textarea" | ... 4 more ... | "file"; required: boolean; placeholder?: string | undefined; options?: { ...; }[] | undefined; validation?: { ....'.


=== TYPE ERRORS FOR FILE: src/apps/forms-builder/front-end/App.vue ===
src/apps/forms-builder/front-end/App.vue(312,23): error TS2345: Argument of type '"connectors-error"' is not assignable to parameter of type 'SocketEvent'.
src/apps/forms-builder/front-end/App.vue(433,44): error TS2339: Property 'value' does not exist on type '{ formKey?: string | undefined; name: string; description?: string | undefined; components: { fieldKey: string; label: string; type: "number" | "text" | "email" | "password" | "textarea" | ... 4 more ... | "file"; ... 4 more ...; value?: any; }[]; validation_rules?: ValidationRules | undefined; }'.
src/apps/forms-builder/front-end/App.vue(434,14): error TS7006: Parameter 'c' implicitly has an 'any' type.
src/apps/forms-builder/front-end/App.vue(437,31): error TS2339: Property 'value' does not exist on type '{ formKey?: string | undefined; name: string; description?: string | undefined; components: { fieldKey: string; label: string; type: "number" | "text" | "email" | "password" | "textarea" | ... 4 more ... | "file"; ... 4 more ...; value?: any; }[]; validation_rules?: ValidationRules | undefined; }'.


=== TYPE ERRORS FOR FILE: src/apps/forms-builder/front-end/App.vue ===
src/apps/forms-builder/front-end/App.vue(516,14): error TS2322: Type '(id: number) => void' is not assignable to type '(id: number | null) => Promise<DataConnector | null>'.
src/apps/forms-builder/front-end/App.vue(516,72): error TS2322: Type '(id: number) => Promise<void>' is not assignable to type '(id: number | null) => void'.


=== TYPE ERRORS FOR FILE: src/apps/forms-builder/front-end/App.vue ===
src/apps/forms-builder/front-end/App.vue(516,14): error TS2322: Type '(id: number | null) => void' is not assignable to type '(id: number | null) => Promise<DataConnector | null>'.


=== TYPE ERRORS FOR FILE: src/apps/forms-builder/front-end/App.vue ===
src/apps/forms-builder/front-end/App.vue(518,14): error TS2322: Type '(id: number | null) => void' is not assignable to type '(id: number | null) => Promise<DataConnector | null>'.


=== TYPE ERRORS FOR FILE: src/apps/forms-builder/front-end/App.vue ===
src/apps/forms-builder/front-end/App.vue(518,14): error TS2322: Type '(id: number | null) => void' is not assignable to type '(id: number | null) => Promise<DataConnector | null>'.


=== TYPE ERRORS FOR FILE: src/apps/forms-builder/front-end/App.vue ===
src/apps/forms-builder/front-end/App.vue(518,14): error TS2322: Type '(id: number | null) => void' is not assignable to type '(id: number | null) => Promise<DataConnector | null>'.


=== TYPE ERRORS FOR FILE: src/apps/forms-builder/back-end/routes/forms.ts ===
src/apps/forms-builder/back-end/routes/forms.ts(84,9): error TS2739: Type '{}' is missing the following properties from type 'FormBuilderContractModel': id, name, description, status, properties
src/apps/forms-builder/back-end/routes/forms.ts(90,14): error TS2339: Property 'io' does not exist on type 'FastifyInstance<RawServerDefault, IncomingMessage, ServerResponse<IncomingMessage>, FastifyBaseLogger, FastifyTypeProviderDefault>'.
src/apps/forms-builder/back-end/routes/forms.ts(130,14): error TS2339: Property 'io' does not exist on type 'FastifyInstance<RawServerDefault, IncomingMessage, ServerResponse<IncomingMessage>, FastifyBaseLogger, FastifyTypeProviderDefault>'.
src/apps/forms-builder/back-end/routes/forms.ts(152,14): error TS2339: Property 'io' does not exist on type 'FastifyInstance<RawServerDefault, IncomingMessage, ServerResponse<IncomingMessage>, FastifyBaseLogger, FastifyTypeProviderDefault>'.
src/apps/forms-builder/back-end/routes/forms.ts(177,14): error TS2339: Property 'io' does not exist on type 'FastifyInstance<RawServerDefault, IncomingMessage, ServerResponse<IncomingMessage>, FastifyBaseLogger, FastifyTypeProviderDefault>'.


=== TYPE ERRORS FOR FILE: src/apps/forms-builder/db/repositories/SubmissionsRepository.ts ===
src/apps/forms-builder/db/repositories/SubmissionsRepository.ts(322,9): error TS2352: Conversion of type '{ appName: any; entityName: any; discoveryUrl: any; discoveryType: any; entityModel: undefined; endpoints: undefined; capabilities: undefined; createdAt: any; updatedAt: any; last_verified_at: any; is_active: any; }' to type 'DataConnector' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.


=== TYPE ERRORS FOR FILE: src/apps/forms-builder/db/repositories/FormsRepository.ts ===
src/apps/forms-builder/db/repositories/FormsRepository.ts(269,9): error TS2352: Conversion of type '{ id: any; appName: any; entityName: any; discoveryUrl: any; discoveryType: any; entityModel: null; endpoints: null; capabilities: null; createdAt: any; updatedAt: any; last_verified_at: any; is_active: any; }' to type 'DataConnector' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
src/apps/forms-builder/db/repositories/FormsRepository.ts(315,12): error TS2352: Conversion of type '{ id: any; formKey: any; name: any; description: any; components: any[]; validationRules: never[]; createdAt: any; updatedAt: any; model: never[]; is_active: any; dataConnecter: DataConnector | null; }' to type 'FormSchema' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.


=== TYPE ERRORS FOR FILE: src/backend/utils/app-server-port-utils.ts ===
src/backend/utils/app-server-port-utils.ts(1,22): error TS2307: Cannot find module 'child_process' or its corresponding type declarations.
src/backend/utils/app-server-port-utils.ts(2,16): error TS2307: Cannot find module 'os' or its corresponding type declarations.
src/backend/utils/app-server-port-utils.ts(3,27): error TS2307: Cannot find module 'util' or its corresponding type declarations.
src/backend/utils/app-server-port-utils.ts(84,5): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
src/backend/utils/app-server-port-utils.ts(87,7): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
src/backend/utils/app-server-port-utils.ts(89,7): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.


=== TYPE ERRORS FOR FILE: src/backend/db/MCPServers/mcp-servers-schema.ts ===
src/backend/db/MCPServers/mcp-servers-schema.ts(67,5): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
src/backend/db/MCPServers/mcp-servers-schema.ts(68,5): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
src/backend/db/MCPServers/mcp-servers-schema.ts(75,15): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
src/backend/db/MCPServers/mcp-servers-schema.ts(75,47): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.


=== TYPE ERRORS FOR FILE: src/apps/forms-builder/front-end/App.vue ===
src/apps/forms-builder/front-end/App.vue(498,73): error TS2345: Argument of type '{ name: string; description: string; components: { fieldKey: string; label: string; type: string; required?: boolean | undefined; placeholder?: string | undefined; options?: { value: string; label: string; }[] | undefined; ... 22 more ...; showIcon?: boolean | undefined; }[]; validationRules: ValidationRules; dataCo...' is not assignable to parameter of type 'Partial<FormSchema>'.
src/apps/forms-builder/front-end/App.vue(507,40): error TS2345: Argument of type '{ formKey: string; name: string; description: string; components: { fieldKey: string; label: string; type: string; required?: boolean | undefined; placeholder?: string | undefined; options?: { value: string; label: string; }[] | undefined; ... 22 more ...; showIcon?: boolean | undefined; }[]; validationRules: Valida...' is not assignable to parameter of type 'Partial<FormSchema>'.


=== TYPE ERRORS FOR FILE: src/apps/forms-builder/front-end/components/form-designer/GridCell.vue ===
src/apps/forms-builder/front-end/components/form-designer/GridCell.vue(59,7): error TS2322: Type '(event: { draggedItems: { data?: FormComponent | undefined; }[]; helpers: { suggestRemove: () => { removedItems: FormComponent[]; } | undefined; }; }) => void' is not assignable to type '(event: IDragEvent<unknown, unknown>) => boolean | void | Promise<boolean | void>'.


=== TYPE ERRORS FOR FILE: src/shared/forms/form-layout.ts ===
src/shared/forms/form-layout.ts(64,27): error TS2538: Type 'undefined' cannot be used as an index type.
src/shared/forms/form-layout.ts(64,69): error TS2538: Type 'undefined' cannot be used as an index type.
src/shared/forms/form-layout.ts(80,7): error TS2322: Type '"left" | "center" | "right" | undefined' is not assignable to type 'FormGridHorizontalAlign'.
src/shared/forms/form-layout.ts(81,7): error TS2322: Type '"top" | "middle" | "bottom" | undefined' is not assignable to type 'FormGridVerticalAlign'.


=== TYPE ERRORS FOR FILE: src/shared/forms/FormRuntime.vue ===
src/shared/forms/FormRuntime.vue(40,8): error TS2345: Argument of type '{ field: IFormGridField; rowIndex: number; columnIndex: number; columns: number; spanClass: string; cellAlignClasses: string; align: { horizontal: FormGridHorizontalAlign; vertical: FormGridVerticalAlign; }; }' is not assignable to parameter of type 'FormGridFieldSlotProps<IFormRuntimeField>'.


=== TYPE ERRORS FOR FILE: src/apps/forms-builder-test-connector/back-end/utils/test-item-service.ts ===
src/apps/forms-builder-test-connector/back-end/utils/test-item-service.ts(154,5): error TS2322: Type 'TestItem | undefined' is not assignable to type 'TestItem | null'.


=== LINT ERRORS FOR FILE: src/apps/forms-builder-test-connector/back-end/utils/test-item-service.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\forms-builder-test-connector\back-end\utils\test-item-service.ts
  4:3  error  'TestItemCreateRequest' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== TYPE ERRORS FOR FILE: src/backend/utils/forms-builder-url-service.ts ===
src/backend/utils/forms-builder-url-service.ts(23,19): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
src/backend/utils/forms-builder-url-service.ts(25,5): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
src/backend/utils/forms-builder-url-service.ts(33,21): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
src/backend/utils/forms-builder-url-service.ts(47,21): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.


=== TYPE ERRORS FOR FILE: src/shared/config/resolveFormsBuilderUrl.node.ts ===
src/shared/config/resolveFormsBuilderUrl.node.ts(10,19): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
src/shared/config/resolveFormsBuilderUrl.node.ts(17,17): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
src/shared/config/resolveFormsBuilderUrl.node.ts(17,50): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.


=== TYPE ERRORS FOR FILE: src/apps/task-list/back-end/routes/connector/discovery.ts ===
src/apps/task-list/back-end/routes/connector/discovery.ts(22,18): error TS2352: Conversion of type '{ id: "number"; title: string; description: string; status: "string"; priority: string; dueDate: string; assigneeId: string; tags: string; taskListId: string; properties: FormBuilderContractModelProperty[]; }' to type 'FormBuilderContractModel' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.


=== TYPE ERRORS FOR FILE: src/apps/task-list/front-end/components/FormsBuilderFormPanel.vue ===
src/apps/task-list/front-end/components/FormsBuilderFormPanel.vue(7,3): error TS2305: Module '"@/shared/forms"' has no exported member 'mapRecordToFieldValues'.


=== LINT ERRORS FOR FILE: src/apps/forms-builder/front-end/components/ConnectorManager.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\forms-builder\front-end\components\ConnectorManager.vue
  293:7  error  Duplicate key 'selectedConnectorId'. May cause name collision in script or template tag  vue/no-dupe-keys

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/apps/forms-builder/front-end/components/ConnectorManagement.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\forms-builder\front-end\components\ConnectorManagement.vue
  483:7   error  Duplicate key 'connectors'. May cause name collision in script or template tag           vue/no-dupe-keys
  484:7   error  Duplicate key 'selectedConnectorId'. May cause name collision in script or template tag  vue/no-dupe-keys
  849:47  error  Unexpected any. Specify a different type                                                 @typescript-eslint/no-explicit-any
  865:38  error  Unexpected any. Specify a different type                                                 @typescript-eslint/no-explicit-any

✖ 4 problems (4 errors, 0 warnings)


=== TYPE ERRORS FOR FILE: src/apps/crm/back-end/services/entity-record-service.ts ===
src/apps/crm/back-end/services/entity-record-service.ts(155,12): error TS2790: The operand of a 'delete' operator must be optional.


=== LINT ERRORS FOR FILE: src/apps/crm/front-end/App.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\crm\front-end\App.vue
  15:8  error  'EntityIcon' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== TYPE ERRORS FOR FILE: src/apps/help-desk/front-end/App.vue ===
src/apps/help-desk/front-end/App.vue(143,5): error TS2322: Type '{ subject: string; description?: string; status: TicketStatus; priority: TicketPriority; assigneeId?: string | null | undefined; requesterLabUserId?: number | null | undefined; requesterEmail?: string | null | undefined; metadata?: string | ... 1 more ... | undefined; id: number; }' is not assignable to type '{ id: number; subject: string; description?: string | undefined; status: TicketStatus; priority: TicketPriority; assigneeId?: string | undefined; metadata?: string | undefined; }'.


=== TYPE ERRORS FOR FILE: src/apps/help-desk/front-end/App.vue ===
src/apps/help-desk/front-end/App.vue(143,5): error TS2322: Type '{ subject: string; description?: string; status: TicketStatus; priority: TicketPriority; assigneeId?: string | null; requesterLabUserId?: number | null | undefined; requesterEmail?: string | null | undefined; metadata?: string | ... 1 more ... | undefined; id: number; }' is not assignable to type '{ id: number; subject: string; description?: string | undefined; status: TicketStatus; priority: TicketPriority; assigneeId?: string | null | undefined; metadata?: string | undefined; }'.


=== TYPE ERRORS FOR FILE: src/apps/help-desk/front-end/components/HelpDeskKanbanTab.vue ===
src/apps/help-desk/front-end/components/HelpDeskKanbanTab.vue(56,15): error TS2345: Argument of type '{ id: string; label: string; }' is not assignable to parameter of type '{ id: string; label: string; column: KanbanBoardColumn; }'.
src/apps/help-desk/front-end/components/HelpDeskKanbanTab.vue(190,16): error TS2322: Type '(priority: TicketPriority) => string' is not assignable to type '(priority: string) => string'.


=== LINT ERRORS FOR FILE: src/backend/utils/template-manager.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\template-manager.ts
   91:14   error  'templateItem' is never reassigned. Use 'const' instead      prefer-const
  110:5    error  'mcpUtils' is defined but never used                         @typescript-eslint/no-unused-vars
  131:5    error  'mcpUtils' is defined but never used                         @typescript-eslint/no-unused-vars
  140:5    error  'mcpUtils' is defined but never used                         @typescript-eslint/no-unused-vars
  198:5    error  'mcpUtils' is defined but never used                         @typescript-eslint/no-unused-vars
  236:5    error  'mcpUtils' is defined but never used                         @typescript-eslint/no-unused-vars
  254:5    error  'mcpUtils' is defined but never used                         @typescript-eslint/no-unused-vars
  273:5    error  'mcpUtils' is defined but never used                         @typescript-eslint/no-unused-vars
  293:7    error  'availableSlashCommands' is assigned a value but never used  @typescript-eslint/no-unused-vars
  308:88   error  Unexpected any. Specify a different type                     @typescript-eslint/no-explicit-any
  308:127  error  Unexpected any. Specify a different type                     @typescript-eslint/no-explicit-any
  347:14   error  'error' is defined but never used                            @typescript-eslint/no-unused-vars
  358:5    error  'mcpUtils' is defined but never used                         @typescript-eslint/no-unused-vars
  367:5    error  'mcpUtils' is defined but never used                         @typescript-eslint/no-unused-vars
  380:9    error  'frontEndFiles' is never reassigned. Use 'const' instead     prefer-const
  381:9    error  'backEndFiles' is never reassigned. Use 'const' instead      prefer-const
  382:9    error  'sharedFiles' is never reassigned. Use 'const' instead       prefer-const
  383:9    error  'testFiles' is never reassigned. Use 'const' instead         prefer-const
  412:5    error  'mcpUtils' is defined but never used                         @typescript-eslint/no-unused-vars

✖ 19 problems (19 errors, 0 warnings)
  5 errors and 0 warnings potentially fixable with the `--fix` option.


=== LINT ERRORS FOR FILE: src/backend/utils/file-helpers.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\file-helpers.ts
  11:10  error  'EXCLUDED_DIRS' is defined but never used  @typescript-eslint/no-unused-vars
  11:40  error  'ICommand' is defined but never used       @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== TYPE ERRORS FOR FILE: src/scripts/lab-stack.ts ===
src/scripts/lab-stack.ts(8,53): error TS2307: Cannot find module 'child_process' or its corresponding type declarations.
src/scripts/lab-stack.ts(9,16): error TS2307: Cannot find module 'fs' or its corresponding type declarations.
src/scripts/lab-stack.ts(10,18): error TS2307: Cannot find module 'path' or its corresponding type declarations.
src/scripts/lab-stack.ts(11,31): error TS2307: Cannot find module 'url' or its corresponding type declarations.
src/scripts/lab-stack.ts(86,10): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
src/scripts/lab-stack.ts(97,10): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
src/scripts/lab-stack.ts(141,15): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
src/scripts/lab-stack.ts(252,5): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
src/scripts/lab-stack.ts(254,3): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
src/scripts/lab-stack.ts(257,3): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
src/scripts/lab-stack.ts(268,30): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
src/scripts/lab-stack.ts(273,47): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
src/scripts/lab-stack.ts(281,19): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
src/scripts/lab-stack.ts(284,5): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.


=== TYPE ERRORS FOR FILE: src/backend/utils/logger.ts ===
src/backend/utils/logger.ts(8,10): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
src/backend/utils/logger.ts(9,3): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
src/backend/utils/logger.ts(10,3): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
src/backend/utils/logger.ts(14,37): error TS2307: Cannot find module 'fs' or its corresponding type declarations.
src/backend/utils/logger.ts(15,39): error TS2307: Cannot find module 'path' or its corresponding type declarations.
src/backend/utils/logger.ts(16,38): error TS2307: Cannot find module 'url' or its corresponding type declarations.
src/backend/utils/logger.ts(32,22): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
src/backend/utils/logger.ts(32,49): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
src/backend/utils/logger.ts(33,27): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.


=== LINT ERRORS FOR FILE: src/shared/composables/components/useLabDashboard.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useLabDashboard.ts
   19:10  error  'AppGateway' is defined but never used                @typescript-eslint/no-unused-vars
   92:36  error  Unexpected any. Specify a different type              @typescript-eslint/no-explicit-any
  190:12  error  'syncWorkspaceLayoutState' is defined but never used  @typescript-eslint/no-unused-vars
  326:9   error  'msgs' is never reassigned. Use 'const' instead       prefer-const
  590:21  error  Unexpected any. Specify a different type              @typescript-eslint/no-explicit-any
  613:21  error  Unexpected any. Specify a different type              @typescript-eslint/no-explicit-any

✖ 6 problems (6 errors, 0 warnings)
  1 error and 0 warnings potentially fixable with the `--fix` option.


=== LINT ERRORS FOR FILE: src/backend/routes/chat/chat-socket-routes.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\routes\chat\chat-socket-routes.ts
  138:48  error  '_data' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/components/useLabDashboard.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useLabDashboard.ts
   62:36  error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  191:9   error  'msgs' is never reassigned. Use 'const' instead  prefer-const

✖ 2 problems (2 errors, 0 warnings)
  1 error and 0 warnings potentially fixable with the `--fix` option.


=== LINT ERRORS FOR FILE: src/shared/composables/components/lab-dashboard/useLabApps.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\lab-dashboard\useLabApps.ts
  13:3  error  'cloneAppWorkspaceLayout' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/components/lab-dashboard/useLabSettingsEmitters.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\lab-dashboard\useLabSettingsEmitters.ts
  7:8  error  'ChatPersona' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/ai/provider-service.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\ai\provider-service.ts
   10:10  error  'Parser' is defined but never used                        @typescript-eslint/no-unused-vars
   11:10  error  'AgentResponse' is defined but never used                 @typescript-eslint/no-unused-vars
   11:25  error  'AgentResponseParser' is defined but never used           @typescript-eslint/no-unused-vars
   11:46  error  'SlashCommandContext' is defined but never used           @typescript-eslint/no-unused-vars
   19:3   error  'Persona' is defined but never used                       @typescript-eslint/no-unused-vars
   22:3   error  'LLMProviderResponse' is defined but never used           @typescript-eslint/no-unused-vars
   23:3   error  'ChatRequestPayload' is defined but never used            @typescript-eslint/no-unused-vars
   26:3   error  'PersonaSwitchedEventData' is defined but never used      @typescript-eslint/no-unused-vars
   29:3   error  'ChatMessageHandlerResponse' is defined but never used    @typescript-eslint/no-unused-vars
   30:3   error  'StopRequestData' is defined but never used               @typescript-eslint/no-unused-vars
   31:3   error  'FILE_PATHS' is defined but never used                    @typescript-eslint/no-unused-vars
   32:3   error  'StreamingDelta' is defined but never used                @typescript-eslint/no-unused-vars
   33:3   error  'StreamingDone' is defined but never used                 @typescript-eslint/no-unused-vars
   34:3   error  'MCPToolInterface' is defined but never used              @typescript-eslint/no-unused-vars
   35:3   error  'MCPToolCall' is defined but never used                   @typescript-eslint/no-unused-vars
   36:3   error  'ChatResponseData' is defined but never used              @typescript-eslint/no-unused-vars
   37:3   error  'ParsedModelOutput' is defined but never used             @typescript-eslint/no-unused-vars
   39:29  error  'AIProviderService' is defined but never used             @typescript-eslint/no-unused-vars
   40:10  error  'fileHelpers' is defined but never used                   @typescript-eslint/no-unused-vars
   42:10  error  'Chat' is defined but never used                          @typescript-eslint/no-unused-vars
   45:10  error  'PersonaService' is defined but never used                @typescript-eslint/no-unused-vars
   46:10  error  'CommandService' is defined but never used                @typescript-eslint/no-unused-vars
  230:13  error  'sysMsg' is never reassigned. Use 'const' instead         prefer-const
  230:21  error  'personaConfig' is never reassigned. Use 'const' instead  prefer-const
  280:13  error  'sysMsg' is never reassigned. Use 'const' instead         prefer-const
  280:21  error  'personaConfig' is never reassigned. Use 'const' instead  prefer-const
  321:41  error  Unexpected any. Specify a different type                  @typescript-eslint/no-explicit-any
  321:75  error  Unexpected any. Specify a different type                  @typescript-eslint/no-explicit-any
  325:81  error  Unexpected any. Specify a different type                  @typescript-eslint/no-explicit-any
  333:56  error  Unexpected any. Specify a different type                  @typescript-eslint/no-explicit-any

✖ 30 problems (30 errors, 0 warnings)
  4 errors and 0 warnings potentially fixable with the `--fix` option.


=== LINT ERRORS FOR FILE: src/backend/utils/template-manager.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\template-manager.ts
  148:5   error  'mcpUtils' is defined but never used                         @typescript-eslint/no-unused-vars
  169:5   error  'mcpUtils' is defined but never used                         @typescript-eslint/no-unused-vars
  178:5   error  'mcpUtils' is defined but never used                         @typescript-eslint/no-unused-vars
  236:5   error  'mcpUtils' is defined but never used                         @typescript-eslint/no-unused-vars
  274:5   error  'mcpUtils' is defined but never used                         @typescript-eslint/no-unused-vars
  294:7   error  'availableSlashCommands' is assigned a value but never used  @typescript-eslint/no-unused-vars
  314:14  error  'error' is defined but never used                            @typescript-eslint/no-unused-vars
  325:5   error  'mcpUtils' is defined but never used                         @typescript-eslint/no-unused-vars

✖ 8 problems (8 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/template-resolvers/mcp-tools-resolver.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\template-resolvers\mcp-tools-resolver.ts
  23:38  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  23:77  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/template-manager.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\template-manager.ts
  148:5  error  '_mcpUtils' is defined but never used  @typescript-eslint/no-unused-vars
  169:5  error  '_mcpUtils' is defined but never used  @typescript-eslint/no-unused-vars
  178:5  error  '_mcpUtils' is defined but never used  @typescript-eslint/no-unused-vars
  236:5  error  '_mcpUtils' is defined but never used  @typescript-eslint/no-unused-vars
  274:5  error  '_mcpUtils' is defined but never used  @typescript-eslint/no-unused-vars
  325:5  error  '_mcpUtils' is defined but never used  @typescript-eslint/no-unused-vars

✖ 6 problems (6 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/services/AppRegistry.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\services\AppRegistry.ts
   18:16  error  'IServerConfig' is defined but never used         @typescript-eslint/no-unused-vars
   18:44  error  'AppConfigWithAppType' is defined but never used  @typescript-eslint/no-unused-vars
   18:78  error  'AppType' is defined but never used               @typescript-eslint/no-unused-vars
   26:68  error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  405:27  error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  431:30  error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  432:34  error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any

✖ 7 problems (7 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/services/TemplateGenerator.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\services\TemplateGenerator.ts
   84:9    error  'dbInsertsuccess' is never reassigned. Use 'const' instead  prefer-const
   85:9    error  'errMsg' is never reassigned. Use 'const' instead           prefer-const
   93:21   error  Unexpected any. Specify a different type                    @typescript-eslint/no-explicit-any
  162:109  error  'port' is assigned a value but never used                   @typescript-eslint/no-unused-vars

✖ 4 problems (4 errors, 0 warnings)
  2 errors and 0 warnings potentially fixable with the `--fix` option.


=== LINT ERRORS FOR FILE: src/shared/services/AppUpdateManager.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\services\AppUpdateManager.ts
   74:59  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
   74:87  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
   81:53  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
   85:77  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
  115:39  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
  142:39  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
  173:19  error  'formattedPath' is assigned a value but never used  @typescript-eslint/no-unused-vars
  276:39  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any

✖ 8 problems (8 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/apps/forms-builder/front-end/views/FormsBuilderDesignerView.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\forms-builder\front-end\views\FormsBuilderDesignerView.vue
   83:28  error  Unexpected mutation of "currentFormSchema" prop  vue/no-mutating-props
  107:28  error  Unexpected mutation of "currentFormSchema" prop  vue/no-mutating-props
  117:28  error  Unexpected mutation of "currentFormSchema" prop  vue/no-mutating-props

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/apps/crm/front-end/components/CrmAppLayout.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\crm\front-end\components\CrmAppLayout.vue
   37:17  error  Unexpected mutation of "ctx" prop  vue/no-mutating-props
  147:24  error  Unexpected mutation of "ctx" prop  vue/no-mutating-props

✖ 2 problems (2 errors, 0 warnings)


=== TYPE ERRORS FOR FILE: src/apps/crm/front-end/composables/useCrmAppShell.ts ===
src/apps/crm/front-end/composables/useCrmAppShell.ts(11,36): error TS2307: Cannot find module './components/CrmSettingsDialog.vue' or its corresponding type declarations.


=== TYPE ERRORS FOR FILE: src/apps/forms-builder/front-end/App.vue ===
src/apps/forms-builder/front-end/App.vue(373,43): error TS2339: Property 'value' does not exist on type 'CreateComponentPublicInstanceWithMixins<ToResolvedProps<__VLS_Props, TypeEmitsToOptions<__VLS_Emit>>, { openSpanConfigForComponent: (component: FormComponent) => void; openLayoutConfigForComponent: (component: FormComponent) => void; }, ... 23 more ..., {}>'.
src/apps/forms-builder/front-end/App.vue(380,43): error TS2339: Property 'value' does not exist on type 'CreateComponentPublicInstanceWithMixins<ToResolvedProps<__VLS_Props, TypeEmitsToOptions<__VLS_Emit>>, { openSpanConfigForComponent: (component: FormComponent) => void; openLayoutConfigForComponent: (component: FormComponent) => void; }, ... 23 more ..., {}>'.


=== TYPE ERRORS FOR FILE: src/backend/mcp/mcp-server-loader.ts ===
src/backend/mcp/mcp-server-loader.ts(226,7): error TS2416: Property 'params' in type 'WrapperClass' is not assignable to the same property in base type 'MCPToolInterface<ZodObject<any, $strip>>'.
src/backend/mcp/mcp-server-loader.ts(280,5): error TS2322: Type 'WrapperClass' is not assignable to type 'MCPToolInterface<ZodObject<any, $strip>>'.


=== TYPE ERRORS FOR FILE: src/backend/mcp/mcp-server-loader.ts ===
src/backend/mcp/mcp-server-loader.ts(226,7): error TS2416: Property 'params' in type 'WrapperClass' is not assignable to the same property in base type 'MCPToolInterface<ZodObject<any, $strip>>'.
src/backend/mcp/mcp-server-loader.ts(280,5): error TS2322: Type 'WrapperClass' is not assignable to type 'MCPToolInterface<ZodObject<any, $strip>>'.


=== TYPE ERRORS FOR FILE: src/shared/config/lab-system-prompt.ts ===
src/shared/config/lab-system-prompt.ts(31,69): error TS2345: Argument of type 'SystemPromptEnv | undefined' is not assignable to parameter of type 'OllamaToolsEnv | undefined'.


=== TYPE ERRORS FOR FILE: src/backend/ai/providers/ollama-provider.ts ===
src/backend/ai/providers/ollama-provider.ts(258,45): error TS2769: No overload matches this call.
src/backend/ai/providers/ollama-provider.ts(302,43): error TS2769: No overload matches this call.


=== TYPE ERRORS FOR FILE: src/backend/ai/providers/ollama-provider.ts ===
src/backend/ai/providers/ollama-provider.ts(269,45): error TS2769: No overload matches this call.
src/backend/ai/providers/ollama-provider.ts(313,43): error TS2769: No overload matches this call.


=== TYPE ERRORS FOR FILE: src/backend/ai/providers/ollama-provider.ts ===
src/backend/ai/providers/ollama-provider.ts(284,43): error TS2769: No overload matches this call.


=== TYPE ERRORS FOR FILE: src/backend/db/Persona/persona-schema.ts ===
src/backend/db/Persona/persona-schema.ts(143,12): error TS2304: Cannot find name 'Persona'.
src/backend/db/Persona/persona-schema.ts(173,8): error TS2304: Cannot find name 'Persona'.
src/backend/db/Persona/persona-schema.ts(194,44): error TS2304: Cannot find name 'PersonaReasoning'.


=== TYPE ERRORS FOR FILE: src/backend/db/Persona/persona-schema.ts ===
src/backend/db/Persona/persona-schema.ts(161,10): error TS2352: Conversion of type '{ id: number; userId: number; name: string; sysMsg: { role: string; capabilities: string; output: string; rules: string; }; tools: string[]; reasoning: { value: number; }; slashCommands: never[]; }' to type 'Persona' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.


=== LINT ERRORS FOR FILE: src/dashboard/components/settings/Settings.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\settings\Settings.vue
  2:38  error  'ref' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/components/settings/UserManagement.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\settings\UserManagement.vue
   30:7   error  'emit' is assigned a value but never used  @typescript-eslint/no-unused-vars
  330:33  error  'idx' is defined but never used            vue/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== TYPE ERRORS FOR FILE: src/backend/routes/httpAuthRoutes.ts ===
src/backend/routes/httpAuthRoutes.ts(231,11): error TS2339: Property 'clearCookie' does not exist on type 'FastifyReply<RawServerDefault, IncomingMessage, ServerResponse<IncomingMessage>, RouteGenericInterface, unknown, FastifySchema, FastifyTypeProviderDefault, unknown>'.


=== TYPE ERRORS FOR FILE: src/dashboard/components/settings/PersonaManagement.vue ===
src/dashboard/components/settings/PersonaManagement.vue(204,68): error TS18048: '__VLS_ctx.activePersona' is possibly 'undefined'.


=== TYPE ERRORS FOR FILE: src/backend/routes/platform-theme-routes.ts ===
src/backend/routes/platform-theme-routes.ts(38,25): error TS2339: Property 'io' does not exist on type 'FastifyInstance<RawServerDefault, IncomingMessage, ServerResponse<IncomingMessage>, FastifyBaseLogger, FastifyTypeProviderDefault>'.


=== TYPE ERRORS FOR FILE: src/backend/comms/lab-comms-socket.ts ===
src/backend/comms/lab-comms-socket.ts(133,37): error TS2352: Conversion of type 'RemoteSocket<DecorateAcknowledgementsWithMultipleResponses<DefaultEventsMap>, any>' to type 'AuthSocket' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
src/backend/comms/lab-comms-socket.ts(135,31): error TS2352: Conversion of type 'RemoteSocket<DecorateAcknowledgementsWithMultipleResponses<DefaultEventsMap>, any>' to type 'AuthSocket' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.


=== TYPE ERRORS FOR FILE: src/shared/types/schemas/lab-comms-schema.ts ===
src/shared/types/schemas/lab-comms-schema.ts(87,14): error TS2554: Expected 2-3 arguments, but got 1.


=== LINT ERRORS FOR FILE: src/shared/composables/components/useLabDashboard.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useLabDashboard.ts
  13:10  error  'io' is defined but never used            @typescript-eslint/no-unused-vars
  64:36  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/apps/time-wasters/front-end/games/tile-word-grid/TileWordGridGame.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\time-wasters\front-end\games\tile-word-grid\TileWordGridGame.vue
   98:11  error  'usedCount' is assigned a value but never used      @typescript-eslint/no-unused-vars
  267:11  error  This 'v-if' should be moved to the wrapper element  vue/no-use-v-if-with-v-for

✖ 2 problems (2 errors, 0 warnings)


=== TYPE ERRORS FOR FILE: src/apps/time-wasters/front-end/games/tile-word-grid/TileBoardCell.vue ===
src/apps/time-wasters/front-end/games/tile-word-grid/TileBoardCell.vue(33,5): error TS2322: Type 'string | boolean' is not assignable to type 'boolean | Ref<boolean, boolean> | undefined'.
src/apps/time-wasters/front-end/games/tile-word-grid/TileBoardCell.vue(51,5): error TS2322: Type 'string | boolean' is not assignable to type 'boolean | undefined'.


=== TYPE ERRORS FOR FILE: src/apps/time-wasters/front-end/games/tile-word-grid/TileBoardCell.vue ===
src/apps/time-wasters/front-end/games/tile-word-grid/TileBoardCell.vue(41,3): error TS2345: Argument of type '() => [string | null, number, number, boolean, string | null]' is not assignable to parameter of type 'TDraggablePayload'.


=== TYPE ERRORS FOR FILE: src/apps/time-wasters/front-end/games/tile-word-grid/TileRackLetter.vue ===
src/apps/time-wasters/front-end/games/tile-word-grid/TileRackLetter.vue(28,3): error TS2345: Argument of type '() => [string, number, boolean]' is not assignable to parameter of type 'TDraggablePayload'.


=== TYPE ERRORS FOR FILE: src/apps/time-wasters/front-end/App.vue ===
src/apps/time-wasters/front-end/App.vue(84,36): error TS2352: Conversion of type 'Record<string, unknown>' to type 'MatchView' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.


=== TYPE ERRORS FOR FILE: src/apps/time-wasters/front-end/games/tile-word-grid/TileBoardStagedTile.vue ===
src/apps/time-wasters/front-end/games/tile-word-grid/TileBoardStagedTile.vue(34,3): error TS2345: Argument of type '() => [string, number, number, boolean]' is not assignable to parameter of type 'TDraggablePayload'.


=== TYPE ERRORS FOR FILE: src/apps/time-wasters/front-end/games/tile-word-grid/TileRackLetter.vue ===
src/apps/time-wasters/front-end/games/tile-word-grid/TileRackLetter.vue(62,3): error TS2345: Argument of type '() => [string, number, boolean]' is not assignable to parameter of type 'TDraggablePayload'.


=== TYPE ERRORS FOR FILE: src/backend/ai/providers/ollama-provider.ts ===
src/backend/ai/providers/ollama-provider.ts(126,15): error TS2339: Property 'num_ctx' does not exist on type '{ temperature: number; num_predict?: number | undefined; top_p?: number | undefined; frequency_penalty?: number | undefined; presence_penalty?: number | undefined; repeat_penalty?: number | undefined; }'.


=== TYPE ERRORS FOR FILE: src/apps/time-wasters/back-end/games/tile-word-grid/llm-agent-move.ts ===
src/apps/time-wasters/back-end/games/tile-word-grid/llm-agent-move.ts(16,28): error TS2307: Cannot find module 'node:crypto' or its corresponding type declarations.


=== TYPE ERRORS FOR FILE: src/backend/db/AppTags/app-tags-repository.ts ===
src/backend/db/AppTags/app-tags-repository.ts(53,65): error TS2554: Expected 1 arguments, but got 0.
src/backend/db/AppTags/app-tags-repository.ts(59,26): error TS2554: Expected 1 arguments, but got 4.
src/backend/db/AppTags/app-tags-repository.ts(71,27): error TS2554: Expected 1 arguments, but got 3.
src/backend/db/AppTags/app-tags-repository.ts(77,56): error TS2554: Expected 1 arguments, but got 0.
src/backend/db/AppTags/app-tags-repository.ts(85,65): error TS2554: Expected 1 arguments, but got 0.
src/backend/db/AppTags/app-tags-repository.ts(89,7): error TS2554: Expected 1 arguments, but got 4.
src/backend/db/AppTags/app-tags-repository.ts(105,7): error TS2554: Expected 1 arguments, but got 4.
src/backend/db/AppTags/app-tags-repository.ts(132,69): error TS2554: Expected 1 arguments, but got 0.
src/backend/db/AppTags/app-tags-repository.ts(160,24): error TS2554: Expected 1 arguments, but got 3.


=== TYPE ERRORS FOR FILE: src/backend/db/AppTags/app-tags-repository.ts ===
src/backend/db/AppTags/app-tags-repository.ts(39,5): error TS2322: Type 'Record<"tags_all" | "tag_by_id" | "tags_count" | "tag_insert" | "tag_update" | "tag_delete" | "tag_max_sort" | "apps_using_tag" | "assignments_for_app" | "assignments_all" | "assignments_delete_for_app" | "assignment_insert" | "app_exists", Statement<...> | Statement<...>>' is not assignable to type 'Partial<Record<"tags_all" | "tag_by_id" | "tags_count" | "tag_insert" | "tag_update" | "tag_delete" | "tag_max_sort" | "apps_using_tag" | "assignments_for_app" | "assignments_all" | "assignments_delete_for_app" | "assignment_insert" | "app_exists", { ...; }>>'.


=== TYPE ERRORS FOR FILE: src/backend/db/AppTags/app-tags-repository.ts ===
src/backend/db/AppTags/app-tags-repository.ts(9,3): error TS2305: Module '"@/shared/config/platform-app-tag-catalog"' has no exported member 'PLATFORM_APP_TAG_SEEDS'.
src/backend/db/AppTags/app-tags-repository.ts(10,3): error TS2305: Module '"@/shared/config/platform-app-tag-catalog"' has no exported member 'SEEDED_APP_TAG_ASSIGNMENTS'.
src/backend/db/AppTags/app-tags-repository.ts(69,7): error TS18046: 'tagIds' is of type 'unknown'.
src/backend/db/AppTags/app-tags-repository.ts(69,23): error TS7006: Parameter 'tagId' implicitly has an 'any' type.
src/backend/db/AppTags/app-tags-repository.ts(69,30): error TS7006: Parameter 'position' implicitly has an 'any' type.


=== LINT ERRORS FOR FILE: src/backend/db/Apps/apps-repository.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Apps\apps-repository.ts
   29:59  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   51:90  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  329:77  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  340:81  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  350:74  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  364:78  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  374:82  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  523:28  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 8 problems (8 errors, 0 warnings)


=== TYPE ERRORS FOR FILE: src/backend/db/AppTags/app-tags-repository.ts ===
src/backend/db/AppTags/app-tags-repository.ts(69,14): error TS2339: Property 'forEach' does not exist on type 'Record<number, "platform" | "productivity" | "builder" | "games" | "utilities" | "examples">'.
src/backend/db/AppTags/app-tags-repository.ts(69,23): error TS7006: Parameter 'tagId' implicitly has an 'any' type.
src/backend/db/AppTags/app-tags-repository.ts(69,30): error TS7006: Parameter 'position' implicitly has an 'any' type.


=== LINT ERRORS FOR FILE: src/backend/db/AppTags/app-tags-repository.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\AppTags\app-tags-repository.ts
  27:62  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/Apps/apps-repository.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Apps\apps-repository.ts
   29:59  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   51:90  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  329:77  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  340:81  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  350:74  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  364:78  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  374:82  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  523:28  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 8 problems (8 errors, 0 warnings)


=== TYPE ERRORS FOR FILE: src/dashboard/components/app/AppContainer.vue ===
src/dashboard/components/app/AppContainer.vue(176,14): error TS2322: Type 'RuntimeApp | IApp' is not assignable to type 'RuntimeApp'.
src/dashboard/components/app/AppContainer.vue(191,11): error TS2322: Type 'Ref<string, string>' is not assignable to type 'Nullable<string>'.


=== LINT ERRORS FOR FILE: src/dashboard/components/app/AppContainer.vue ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\app\AppContainer.vue
  69:10  error  'sortAppsByOrder' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/components/app/AppCatalogGridSection.vue ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\app\AppCatalogGridSection.vue
   3:8  error  'AppCard' is defined but never used               @typescript-eslint/no-unused-vars
  12:9  error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  24:7  error  'isFiltering' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/components/app/AppCatalogGridSection.vue ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\app\AppCatalogGridSection.vue
   2:10  error  'computed' is defined but never used        @typescript-eslint/no-unused-vars
  16:7   error  'props' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/components/app/AppContainer.vue ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\app\AppContainer.vue
  93:33  error  'togglePin' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/tests/backend/app-tags-repository.test.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\tests\backend\app-tags-repository.test.ts
  5:10  error  'SEEDED_APP_TAG_ASSIGNMENTS' is defined but never used  @typescript-eslint/no-unused-vars
  5:38  error  'PLATFORM_APP_TAG_SEEDS' is defined but never used      @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/tests/backend/app-tags-repository.test.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\tests\backend\app-tags-repository.test.ts
  5:10  error  'SEEDED_APP_TAG_ASSIGNMENTS' is defined but never used  @typescript-eslint/no-unused-vars
  5:38  error  'PLATFORM_APP_TAG_SEEDS' is defined but never used      @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== TYPE ERRORS FOR FILE: src/dashboard/components/app/AppContainer.vue ===
src/dashboard/components/app/AppContainer.vue(176,63): error TS2339: Property 'length' does not exist on type 'ComputedRef<RuntimeApp[] | IApp[]>'.
src/dashboard/components/app/AppContainer.vue(184,23): error TS2339: Property 'id' does not exist on type 'true | RuntimeApp[] | ComputedRefImpl<any> | IApp[]'.
src/dashboard/components/app/AppContainer.vue(185,19): error TS2352: Conversion of type 'boolean | RuntimeApp[] | ComputedRefImpl<any> | IApp[]' to type 'RuntimeApp' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
src/dashboard/components/app/AppContainer.vue(187,43): error TS2339: Property 'id' does not exist on type 'true | RuntimeApp[] | ComputedRefImpl<any> | IApp[]'.
src/dashboard/components/app/AppContainer.vue(191,43): error TS2339: Property 'id' does not exist on type 'true | RuntimeApp[] | ComputedRefImpl<any> | IApp[]'.
src/dashboard/components/app/AppContainer.vue(191,51): error TS2339: Property 'name' does not exist on type 'true | RuntimeApp[] | ComputedRefImpl<any> | IApp[]'.
src/dashboard/components/app/AppContainer.vue(192,47): error TS2339: Property 'id' does not exist on type 'true | RuntimeApp[] | ComputedRefImpl<any> | IApp[]'.
src/dashboard/components/app/AppContainer.vue(224,11): error TS2322: Type 'Ref<string, string>' is not assignable to type 'Nullable<string>'.
src/dashboard/components/app/AppContainer.vue(251,76): error TS2339: Property 'includes' does not exist on type 'Ref<string[], string[]>'.
src/dashboard/components/app/AppContainer.vue(271,72): error TS2339: Property 'tag' does not exist on type 'true | ComputedRefImpl<any> | CatalogTagSection[]'.
src/dashboard/components/app/AppContainer.vue(274,65): error TS2339: Property 'tag' does not exist on type 'true | ComputedRefImpl<any> | CatalogTagSection[]'.
src/dashboard/components/app/AppContainer.vue(275,32): error TS2339: Property 'tag' does not exist on type 'true | ComputedRefImpl<any> | CatalogTagSection[]'.
src/dashboard/components/app/AppContainer.vue(275,94): error TS2339: Property 'tag' does not exist on type 'true | ComputedRefImpl<any> | CatalogTagSection[]'.
src/dashboard/components/app/AppContainer.vue(279,39): error TS2339: Property 'apps' does not exist on type 'true | ComputedRefImpl<any> | CatalogTagSection[]'.
src/dashboard/components/app/AppContainer.vue(295,72): error TS2339: Property 'tag' does not exist on type 'true | ComputedRefImpl<any> | CatalogTagSection[]'.
src/dashboard/components/app/AppContainer.vue(298,65): error TS2339: Property 'tag' does not exist on type 'true | ComputedRefImpl<any> | CatalogTagSection[]'.
src/dashboard/components/app/AppContainer.vue(299,32): error TS2339: Property 'tag' does not exist on type 'true | ComputedRefImpl<any> | CatalogTagSection[]'.
src/dashboard/components/app/AppContainer.vue(299,94): error TS2339: Property 'tag' does not exist on type 'true | ComputedRefImpl<any> | CatalogTagSection[]'.
src/dashboard/components/app/AppContainer.vue(302,30): error TS2339: Property 'apps' does not exist on type 'true | ComputedRefImpl<any> | CatalogTagSection[]'.
src/dashboard/components/app/AppContainer.vue(316,20): error TS2352: Conversion of type 'ComputedRef<IApp[]>' to type 'RuntimeApp[]' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.


=== TYPE ERRORS FOR FILE: src/dashboard/components/app/AppContainer.vue ===
src/dashboard/components/app/AppContainer.vue(14,31): error TS2305: Module '"../../../shared/types/platform-app-tags"' has no exported member 'CatalogTagSection'.
src/dashboard/components/app/AppContainer.vue(196,65): error TS2551: Property 'value' does not exist on type 'string[]'. Did you mean 'values'?
src/dashboard/components/app/AppContainer.vue(203,42): error TS2551: Property 'value' does not exist on type 'string[]'. Did you mean 'values'?
src/dashboard/components/app/AppContainer.vue(211,38): error TS2551: Property 'value' does not exist on type 'string[]'. Did you mean 'values'?


=== TYPE ERRORS FOR FILE: src/dashboard/components/app/AppContainer.vue ===
src/dashboard/components/app/AppContainer.vue(222,11): error TS2322: Type 'Ref<string, string>' is not assignable to type 'Nullable<string>'.
src/dashboard/components/app/AppContainer.vue(249,76): error TS2339: Property 'includes' does not exist on type 'Ref<string[], string[]>'.


=== LINT ERRORS FOR FILE: src/dashboard/components/app/AppContainer.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\app\AppContainer.vue
  98:23  error  'loadPins' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== TYPE ERRORS FOR FILE: src/dashboard/components/app/AppContainer.vue ===
src/dashboard/components/app/AppContainer.vue(222,11): error TS2322: Type 'Ref<string, string>' is not assignable to type 'Nullable<string>'.


=== TYPE ERRORS FOR FILE: src/tests/shared/composables/catalog/useAppPins.test.ts ===
src/tests/shared/composables/catalog/useAppPins.test.ts(4,17): error TS2304: Cannot find name 'jest'.
src/tests/shared/composables/catalog/useAppPins.test.ts(5,17): error TS2304: Cannot find name 'jest'.
src/tests/shared/composables/catalog/useAppPins.test.ts(7,1): error TS2304: Cannot find name 'jest'.


=== TYPE ERRORS FOR FILE: src/tests/shared/composables/collect-dependency-apps-to-teardown.test.ts ===
src/tests/shared/composables/collect-dependency-apps-to-teardown.test.ts(23,5): error TS2741: Property 'version' is missing in type '{ category: string; author: string; tags: never[]; }' but required in type 'AppMetadata'.


=== TYPE ERRORS FOR FILE: src/dashboard/components/app/AppContainer.vue ===
src/dashboard/components/app/AppContainer.vue(222,11): error TS2322: Type 'Ref<string, string>' is not assignable to type 'Nullable<string>'.


=== LINT ERRORS FOR FILE: src/dashboard/components/app/AppContainer.vue ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\app\AppContainer.vue
  88:13  error  'pinnedAppIds' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== TYPE ERRORS FOR FILE: src/tests/shared/composables/catalog/useAppPins.test.ts ===
src/tests/shared/composables/catalog/useAppPins.test.ts(38,42): error TS2554: Expected 0 arguments, but got 1.
src/tests/shared/composables/catalog/useAppPins.test.ts(52,46): error TS2554: Expected 0 arguments, but got 1.
src/tests/shared/composables/catalog/useAppPins.test.ts(65,42): error TS2554: Expected 0 arguments, but got 1.


=== LINT ERRORS FOR FILE: src/services/AppLifecycle.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\services\AppLifecycle.ts
  33:24  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: scripts/build-tree.js ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\scripts\build-tree.js
  6:7  error  '__filename' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: scripts/build-tree.js ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\scripts\build-tree.js
  3:10  error  'fileURLToPath' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: scripts/run-test-by-name.js ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\scripts\run-test-by-name.js
  9:7  error  '__dirname' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: scripts/type-check-file.js ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\scripts\type-check-file.js
  86:12  error  'unlinkErr' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/services/AppLifecycle.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\services\AppLifecycle.ts
  2:10  error  'orderDependenciesForLaunch' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/MCPServers/mcp-servers-repository.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\MCPServers\mcp-servers-repository.ts
  159:9  error  'config' is never reassigned. Use 'const' instead  prefer-const

✖ 1 problem (1 error, 0 warnings)
  1 error and 0 warnings potentially fixable with the `--fix` option.


=== LINT ERRORS FOR FILE: src/backend/db/Auth/auth-service.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Auth\auth-service.ts
   11:8   error  'aiProviderService' is defined but never used  @typescript-eslint/no-unused-vars
  205:14  error  'error' is defined but never used              @typescript-eslint/no-unused-vars
  249:14  error  'error' is defined but never used              @typescript-eslint/no-unused-vars
  270:14  error  'error' is defined but never used              @typescript-eslint/no-unused-vars

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/Apps/apps-repository.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Apps\apps-repository.ts
  329:77  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  340:81  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  350:74  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  364:78  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  374:82  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  523:28  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 6 problems (6 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/chat/base-utils.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\chat\base-utils.ts
  255:9   error  'toolCallFromReasoning' is never reassigned. Use 'const' instead  prefer-const
  419:24  error  'content' is assigned a value but never used                      @typescript-eslint/no-unused-vars
  435:11  error  'total' is never reassigned. Use 'const' instead                  prefer-const

✖ 3 problems (3 errors, 0 warnings)
  2 errors and 0 warnings potentially fixable with the `--fix` option.


=== LINT ERRORS FOR FILE: src/backend/utils/template-resolvers/persona-resolver.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\template-resolvers\persona-resolver.ts
  12:3  error  'isDeveloperMode' is defined but never used  @typescript-eslint/no-unused-vars
  13:3  error  'providerData' is defined but never used     @typescript-eslint/no-unused-vars
  14:3  error  'templateData' is defined but never used     @typescript-eslint/no-unused-vars
  31:3  error  'sessionId' is defined but never used        @typescript-eslint/no-unused-vars
  32:3  error  'persona' is defined but never used          @typescript-eslint/no-unused-vars
  33:3  error  'isDeveloperMode' is defined but never used  @typescript-eslint/no-unused-vars
  34:3  error  'providerData' is defined but never used     @typescript-eslint/no-unused-vars
  35:3  error  'templateData' is defined but never used     @typescript-eslint/no-unused-vars

✖ 8 problems (8 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/template-resolvers/persona-resolver.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\template-resolvers\persona-resolver.ts
  12:3  error  '_isDeveloperMode' is defined but never used  @typescript-eslint/no-unused-vars
  13:3  error  '_providerData' is defined but never used     @typescript-eslint/no-unused-vars
  14:3  error  '_templateData' is defined but never used     @typescript-eslint/no-unused-vars
  31:3  error  '_sessionId' is defined but never used        @typescript-eslint/no-unused-vars
  32:3  error  '_persona' is defined but never used          @typescript-eslint/no-unused-vars
  33:3  error  '_isDeveloperMode' is defined but never used  @typescript-eslint/no-unused-vars
  34:3  error  '_providerData' is defined but never used     @typescript-eslint/no-unused-vars
  35:3  error  '_templateData' is defined but never used     @typescript-eslint/no-unused-vars

✖ 8 problems (8 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/type-script-validator.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\type-script-validator.ts
   1:10  error  'spawn' is defined but never used                   @typescript-eslint/no-unused-vars
  15:48  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
  16:5   error  'utilPromisify' is assigned a value but never used  @typescript-eslint/no-unused-vars
  16:43  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
  39:26  error  '_code' is defined but never used                   @typescript-eslint/no-unused-vars

✖ 5 problems (5 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/LabDashboard.vue ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\LabDashboard.vue
  23:800   error  'RuntimeApp' is defined but never used                                   @typescript-eslint/no-unused-vars
  41:917   error  'manageProviderConfigRequestHandler' is assigned a value but never used  @typescript-eslint/no-unused-vars
  41:1834  error  'showLoadingModal' is assigned a value but never used                    @typescript-eslint/no-unused-vars
  41:1852  error  'hideLoadingModal' is assigned a value but never used                    @typescript-eslint/no-unused-vars
  41:1912  error  'deleteSessionWrapper' is assigned a value but never used                @typescript-eslint/no-unused-vars
  41:2455  error  'handleTeardownApp' is assigned a value but never used                   @typescript-eslint/no-unused-vars
  41:2510  error  'sortByOrder' is assigned a value but never used                         @typescript-eslint/no-unused-vars
  41:2536  error  'activeTabId' is assigned a value but never used                         @typescript-eslint/no-unused-vars

✖ 8 problems (8 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/LabDashboard.vue ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\LabDashboard.vue
  18:750   error  'RuntimeApp' is defined but never used                                   @typescript-eslint/no-unused-vars
  35:917   error  'manageProviderConfigRequestHandler' is assigned a value but never used  @typescript-eslint/no-unused-vars
  35:1810  error  'showLoadingModal' is assigned a value but never used                    @typescript-eslint/no-unused-vars
  35:1828  error  'hideLoadingModal' is assigned a value but never used                    @typescript-eslint/no-unused-vars
  35:1888  error  'deleteSessionWrapper' is assigned a value but never used                @typescript-eslint/no-unused-vars
  35:2397  error  'emitLaunchForTab' is assigned a value but never used                    @typescript-eslint/no-unused-vars
  35:2431  error  'handleTeardownApp' is assigned a value but never used                   @typescript-eslint/no-unused-vars
  35:2486  error  'sortByOrder' is assigned a value but never used                         @typescript-eslint/no-unused-vars
  35:2512  error  'activeTabId' is assigned a value but never used                         @typescript-eslint/no-unused-vars

✖ 9 problems (9 errors, 0 warnings)


=== TYPE ERRORS FOR FILE: src/backend/db/Command/command-repository.ts ===
src/backend/db/Command/command-repository.ts(42,30): error TS2339: Property 'get' does not exist on type '<BindParameters extends unknown[] | {} = unknown[], Result = unknown>(source: string) => BindParameters extends unknown[] ? Statement<BindParameters, Result> : Statement<[BindParameters], Result>'.
src/backend/db/Command/command-repository.ts(62,31): error TS2339: Property 'all' does not exist on type '<BindParameters extends unknown[] | {} = unknown[], Result = unknown>(source: string) => BindParameters extends unknown[] ? Statement<BindParameters, Result> : Statement<[BindParameters], Result>'.
src/backend/db/Command/command-repository.ts(65,39): error TS2345: Argument of type '(row: Record<string, unknown>) => { key: string; description: string; text: string; persona: string; argumentHints: any; userId: number; }' is not assignable to parameter of type '(value: unknown, index: number, array: unknown[]) => { key: string; description: string; text: string; persona: string; argumentHints: any; userId: number; }'.
src/backend/db/Command/command-repository.ts(80,31): error TS2339: Property 'all' does not exist on type '<BindParameters extends unknown[] | {} = unknown[], Result = unknown>(source: string) => BindParameters extends unknown[] ? Statement<BindParameters, Result> : Statement<[BindParameters], Result>'.
src/backend/db/Command/command-repository.ts(83,39): error TS2345: Argument of type '(row: Record<string, unknown>) => { key: string; description: string; text: string; persona: string; argumentHints: any; userId: number; }' is not assignable to parameter of type '(value: unknown, index: number, array: unknown[]) => { key: string; description: string; text: string; persona: string; argumentHints: any; userId: number; }'.
src/backend/db/Command/command-repository.ts(97,7): error TS2532: Object is possibly 'undefined'.
src/backend/db/Command/command-repository.ts(97,55): error TS2339: Property 'run' does not exist on type '<BindParameters extends unknown[] | {} = unknown[], Result = unknown>(source: string) => BindParameters extends unknown[] ? Statement<BindParameters, Result> : Statement<[BindParameters], Result>'.
src/backend/db/Command/command-repository.ts(114,7): error TS2532: Object is possibly 'undefined'.
src/backend/db/Command/command-repository.ts(114,55): error TS2339: Property 'run' does not exist on type '<BindParameters extends unknown[] | {} = unknown[], Result = unknown>(source: string) => BindParameters extends unknown[] ? Statement<BindParameters, Result> : Statement<[BindParameters], Result>'.
src/backend/db/Command/command-repository.ts(128,7): error TS2532: Object is possibly 'undefined'.
src/backend/db/Command/command-repository.ts(128,55): error TS2339: Property 'run' does not exist on type '<BindParameters extends unknown[] | {} = unknown[], Result = unknown>(source: string) => BindParameters extends unknown[] ? Statement<BindParameters, Result> : Statement<[BindParameters], Result>'.
src/backend/db/Command/command-repository.ts(137,27): error TS2532: Object is possibly 'undefined'.
src/backend/db/Command/command-repository.ts(137,83): error TS2339: Property 'get' does not exist on type '<BindParameters extends unknown[] | {} = unknown[], Result = unknown>(source: string) => BindParameters extends unknown[] ? Statement<BindParameters, Result> : Statement<[BindParameters], Result>'.
src/backend/db/Command/command-repository.ts(152,31): error TS2339: Property 'all' does not exist on type '<BindParameters extends unknown[] | {} = unknown[], Result = unknown>(source: string) => BindParameters extends unknown[] ? Statement<BindParameters, Result> : Statement<[BindParameters], Result>'.
src/backend/db/Command/command-repository.ts(155,39): error TS2345: Argument of type '(row: Record<string, unknown>) => { key: string; description: string; text: string; persona: string; argumentHints: any; userId: number; }' is not assignable to parameter of type '(value: unknown, index: number, array: unknown[]) => { key: string; description: string; text: string; persona: string; argumentHints: any; userId: number; }'.


=== LINT ERRORS FOR FILE: src/backend/db/Auth/auth-service.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Auth\auth-service.ts
  205:14  error  'error' is defined but never used  @typescript-eslint/no-unused-vars
  249:14  error  'error' is defined but never used  @typescript-eslint/no-unused-vars
  270:14  error  'error' is defined but never used  @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/Auth/auth-service.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Auth\auth-service.ts
  205:14  error  '_error' is defined but never used  @typescript-eslint/no-unused-vars
  249:14  error  '_error' is defined but never used  @typescript-eslint/no-unused-vars
  270:14  error  '_error' is defined but never used  @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/Auth/auth-repository.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Auth\auth-repository.ts
   45:91  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  235:33  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  259:33  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/ContextSettings/context-settings-repository.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\ContextSettings\context-settings-repository.ts
   12:70   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   22:107  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   40:92   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   50:87   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  103:97   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  147:40   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 6 problems (6 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/ContextSettings/context-settings-repository.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\ContextSettings\context-settings-repository.ts
   22:107  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  103:97   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  147:40   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/ContextSettings/context-settings-repository.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\ContextSettings\context-settings-repository.ts
  103:97  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  147:40  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/ContextSettings/context-settings-repository.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\ContextSettings\context-settings-repository.ts
  147:40  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/Tools/tools-repository.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Tools\tools-repository.ts
  14:60  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  25:91  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  37:76  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  38:27  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  48:79  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 5 problems (5 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/Tools/tools-repository.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Tools\tools-repository.ts
  38:27  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  48:79  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/Tools/tools-repository.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Tools\tools-repository.ts
  48:79  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/UserInstructions/user-instructions-repository.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\UserInstructions\user-instructions-repository.ts
  13:71  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  24:20  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  42:46  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  86:40  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  89:30  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 5 problems (5 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/UserInstructions/user-instructions-repository.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\UserInstructions\user-instructions-repository.ts
  42:46  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  86:40  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  89:30  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/UserInstructions/user-instructions-repository.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\UserInstructions\user-instructions-repository.ts
  86:40  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  89:30  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/UserInstructions/user-instructions-repository.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\UserInstructions\user-instructions-repository.ts
  89:30  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/Persona/persona-schema.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Persona\persona-schema.ts
    2:33  error  'SeedPersona' is defined but never used         @typescript-eslint/no-unused-vars
    2:46  error  'SeedToolPermission' is defined but never used  @typescript-eslint/no-unused-vars
  221:48  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/AIProvider/ai-provider-schema.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\AIProvider\ai-provider-schema.ts
  110:9   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  111:38  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/AIProvider/ai-provider-service.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\AIProvider\ai-provider-service.ts
  6:3  error  'LLMChatProviderConfig' is defined but never used   @typescript-eslint/no-unused-vars
  7:3  error  'LLMEmbedProviderConfig' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/Apps/apps-schema.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Apps\apps-schema.ts
  185:7   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  187:32  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/Auth/auth-schema.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Auth\auth-schema.ts
  126:9   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  127:32  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/Command/command-schema.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Command\command-schema.ts
  52:49  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  52:86  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/ContextSettings/context-settings-schema.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\ContextSettings\context-settings-schema.ts
  81:9   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  82:43  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/Tools/tools-schema.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Tools\tools-schema.ts
  85:7   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  86:33  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/UserInstructions/user-instructions-schema.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\UserInstructions\user-instructions-schema.ts
  34:57   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  34:103  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/MCPServers/mcp-servers-schema.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\MCPServers\mcp-servers-schema.ts
  253:51  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  253:91  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/AIProvider/ai-provider-repository.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\AIProvider\ai-provider-repository.ts
  22:65  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/AppTags/app-tags-repository.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\AppTags\app-tags-repository.ts
  27:62  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/Auth/platform-user-query.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Auth\platform-user-query.ts
  9:15  error  'UserRole' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/DatabaseManager.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\DatabaseManager.ts
  50:5  error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/MCPServers/mcp-servers-service.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\MCPServers\mcp-servers-service.ts
  42:68  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/Repository.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Repository.ts
  4:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/apps/utils/app-manager-base-handlers.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\apps\utils\app-manager-base-handlers.ts
    2:10  error  'VSCodeLogger' is defined but never used                                                                    @typescript-eslint/no-unused-vars
    4:3   error  'MCPToolInterface' is defined but never used                                                                @typescript-eslint/no-unused-vars
   10:3   error  'createAppSchemaFields' is defined but never used                                                           @typescript-eslint/no-unused-vars
   11:3   error  'getAppSchemaFields' is defined but never used                                                              @typescript-eslint/no-unused-vars
   12:3   error  'getAppsSchemaFields' is defined but never used                                                             @typescript-eslint/no-unused-vars
   13:3   error  'updateAppSchemaFields' is defined but never used                                                           @typescript-eslint/no-unused-vars
   14:3   error  'deleteAppSchemaFields' is defined but never used                                                           @typescript-eslint/no-unused-vars
   15:3   error  'addTableSchemaFields' is defined but never used                                                            @typescript-eslint/no-unused-vars
   16:3   error  'removeTableSchemaFields' is defined but never used                                                         @typescript-eslint/no-unused-vars
   17:3   error  'addColumnSchemaFields' is defined but never used                                                           @typescript-eslint/no-unused-vars
   18:3   error  'removeColumnSchemaFields' is defined but never used                                                        @typescript-eslint/no-unused-vars
   19:3   error  'selectSchemaFields' is defined but never used                                                              @typescript-eslint/no-unused-vars
   20:3   error  'insertSchemaFields' is defined but never used                                                              @typescript-eslint/no-unused-vars
   21:3   error  'updateSchemaFields' is defined but never used                                                              @typescript-eslint/no-unused-vars
   22:3   error  'deleteSchemaFields' is defined but never used                                                              @typescript-eslint/no-unused-vars
   23:3   error  'executeRawSchemaFields' is defined but never used                                                          @typescript-eslint/no-unused-vars
   32:8   error  'z' is defined but never used                                                                               @typescript-eslint/no-unused-vars
   39:10  error  'STANDARD_TABLE_NAMES' is defined but never used                                                            @typescript-eslint/no-unused-vars
  388:52  error  Optional chain expressions can return undefined by design - using a non-null assertion is unsafe and wrong  @typescript-eslint/no-non-null-asserted-optional-chain
  393:60  error  Optional chain expressions can return undefined by design - using a non-null assertion is unsafe and wrong  @typescript-eslint/no-non-null-asserted-optional-chain
  394:56  error  Optional chain expressions can return undefined by design - using a non-null assertion is unsafe and wrong  @typescript-eslint/no-non-null-asserted-optional-chain
  395:58  error  Optional chain expressions can return undefined by design - using a non-null assertion is unsafe and wrong  @typescript-eslint/no-non-null-asserted-optional-chain
  400:61  error  Optional chain expressions can return undefined by design - using a non-null assertion is unsafe and wrong  @typescript-eslint/no-non-null-asserted-optional-chain
  401:55  error  Optional chain expressions can return undefined by design - using a non-null assertion is unsafe and wrong  @typescript-eslint/no-non-null-asserted-optional-chain
  402:57  error  Optional chain expressions can return undefined by design - using a non-null assertion is unsafe and wrong  @typescript-eslint/no-non-null-asserted-optional-chain

✖ 25 problems (25 errors, 0 warnings)


=== LINT ERRORS FOR FILE: scripts/generate-theme-migration-matrix.mjs ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\scripts\generate-theme-migration-matrix.mjs
  76:30  error  'scan' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: scripts/large-file-tracker/build-large-file-tree.js ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\scripts\large-file-tracker\build-large-file-tree.js
  13:7  error  '__dirname' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: scripts/large-file-tracker/find-large-files.js ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\scripts\large-file-tracker\find-large-files.js
  26:14  error  'error' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: vite.config.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\vite.config.ts
  23:16  error  'error' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: scripts/generate-theme-migration-matrix.mjs ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\scripts\generate-theme-migration-matrix.mjs
  76:30  error  'scan' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: scripts/large-file-tracker/build-large-file-tree.js ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\scripts\large-file-tracker\build-large-file-tree.js
  13:7  error  '__dirname' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: scripts/large-file-tracker/find-large-files.js ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\scripts\large-file-tracker\find-large-files.js
  26:14  error  'error' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: vite.config.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\vite.config.ts
  23:16  error  'error' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: scripts/generate-theme-migration-matrix.mjs ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\scripts\generate-theme-migration-matrix.mjs
  76:30  error  'scan' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: scripts/large-file-tracker/build-large-file-tree.js ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\scripts\large-file-tracker\build-large-file-tree.js
  13:7  error  '__dirname' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: scripts/large-file-tracker/find-large-files.js ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\scripts\large-file-tracker\find-large-files.js
  26:14  error  'error' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: vite.config.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\vite.config.ts
  23:16  error  'error' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: scripts/generate-theme-migration-matrix.mjs ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\scripts\generate-theme-migration-matrix.mjs
  76:30  error  '_scan' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: scripts/generate-theme-migration-matrix.mjs ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\scripts\generate-theme-migration-matrix.mjs
  76:30  error  '_scan' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/MCPServers/mcp-servers-repository.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\MCPServers\mcp-servers-repository.ts
    8:3  error  'getDefaultMCPServerInsert' is defined but never used  @typescript-eslint/no-unused-vars
    9:3  error  'mcpServerConfig' is defined but never used            @typescript-eslint/no-unused-vars
  173:9  error  'config' is never reassigned. Use 'const' instead      prefer-const

✖ 3 problems (3 errors, 0 warnings)
  1 error and 0 warnings potentially fixable with the `--fix` option.


=== LINT ERRORS FOR FILE: src/backend/db/Command/command-repository.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Command\command-repository.ts
   24:20  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   45:27  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   64:30  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   82:30  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  154:30  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 5 problems (5 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/Command/command-repository.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Command\command-repository.ts
   45:27  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   64:30  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   82:30  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  154:30  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/MCPServers/mcp-servers-repository.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\MCPServers\mcp-servers-repository.ts
    8:3  error  'getDefaultMCPServerInsert' is defined but never used  @typescript-eslint/no-unused-vars
    9:3  error  'mcpServerConfig' is defined but never used            @typescript-eslint/no-unused-vars
  173:9  error  'config' is never reassigned. Use 'const' instead      prefer-const

✖ 3 problems (3 errors, 0 warnings)
  1 error and 0 warnings potentially fixable with the `--fix` option.


=== LINT ERRORS FOR FILE: src/backend/db/Command/command-repository.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Command\command-repository.ts
   45:27  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   64:30  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   82:30  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  154:30  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/MCPStdioAccess/mcp-stdio-access-repository.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\MCPStdioAccess\mcp-stdio-access-repository.ts
   7:3    error  'McpStdioAccessSQLStatementKey' is defined but never used  @typescript-eslint/no-unused-vars
  32:83   error  Unexpected any. Specify a different type                   @typescript-eslint/no-explicit-any
  37:100  error  Unexpected any. Specify a different type                   @typescript-eslint/no-explicit-any
  44:74   error  Unexpected any. Specify a different type                   @typescript-eslint/no-explicit-any
  48:87   error  Unexpected any. Specify a different type                   @typescript-eslint/no-explicit-any
  53:91   error  Unexpected any. Specify a different type                   @typescript-eslint/no-explicit-any
  61:87   error  Unexpected any. Specify a different type                   @typescript-eslint/no-explicit-any
  70:83   error  Unexpected any. Specify a different type                   @typescript-eslint/no-explicit-any
  80:101  error  Unexpected any. Specify a different type                   @typescript-eslint/no-explicit-any
  88:79   error  Unexpected any. Specify a different type                   @typescript-eslint/no-explicit-any

✖ 10 problems (10 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/MCPServers/mcp-servers-repository.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\MCPServers\mcp-servers-repository.ts
    8:3  error  'getDefaultMCPServerInsert' is defined but never used  @typescript-eslint/no-unused-vars
    9:3  error  'mcpServerConfig' is defined but never used            @typescript-eslint/no-unused-vars
  173:9  error  'config' is never reassigned. Use 'const' instead      prefer-const

✖ 3 problems (3 errors, 0 warnings)
  1 error and 0 warnings potentially fixable with the `--fix` option.


=== LINT ERRORS FOR FILE: src/backend/db/Command/command-repository.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Command\command-repository.ts
   45:27  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   64:30  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   82:30  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  154:30  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/MCPStdioAccess/mcp-stdio-access-repository.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\MCPStdioAccess\mcp-stdio-access-repository.ts
   7:3    error  'McpStdioAccessSQLStatementKey' is defined but never used  @typescript-eslint/no-unused-vars
  32:83   error  Unexpected any. Specify a different type                   @typescript-eslint/no-explicit-any
  37:100  error  Unexpected any. Specify a different type                   @typescript-eslint/no-explicit-any
  44:74   error  Unexpected any. Specify a different type                   @typescript-eslint/no-explicit-any
  48:87   error  Unexpected any. Specify a different type                   @typescript-eslint/no-explicit-any
  53:91   error  Unexpected any. Specify a different type                   @typescript-eslint/no-explicit-any
  61:87   error  Unexpected any. Specify a different type                   @typescript-eslint/no-explicit-any
  70:83   error  Unexpected any. Specify a different type                   @typescript-eslint/no-explicit-any
  80:101  error  Unexpected any. Specify a different type                   @typescript-eslint/no-explicit-any
  88:79   error  Unexpected any. Specify a different type                   @typescript-eslint/no-explicit-any

✖ 10 problems (10 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/Apps/apps-repository.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Apps\apps-repository.ts
   21:59  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   39:90  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  196:77  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  207:81  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  217:74  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  226:78  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  236:82  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  374:28  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 8 problems (8 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/Persona/persona-repository.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Persona\persona-repository.ts
   17:62   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   32:99   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  113:92   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  125:96   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  136:87   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  147:112  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  159:130  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  221:32   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 8 problems (8 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/Auth/auth-repository.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Auth\auth-repository.ts
   20:55  error  'GlobalPermissions' is defined but never used  @typescript-eslint/no-unused-vars
   20:74  error  'AppPermission' is defined but never used      @typescript-eslint/no-unused-vars
   23:10  error  'commandRepository' is defined but never used  @typescript-eslint/no-unused-vars
   26:59  error  Unexpected any. Specify a different type       @typescript-eslint/no-explicit-any
   46:91  error  Unexpected any. Specify a different type       @typescript-eslint/no-explicit-any
  236:33  error  Unexpected any. Specify a different type       @typescript-eslint/no-explicit-any
  260:33  error  Unexpected any. Specify a different type       @typescript-eslint/no-explicit-any

✖ 7 problems (7 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/ContextSettings/context-settings-repository.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\ContextSettings\context-settings-repository.ts
   12:70   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   22:107  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   40:92   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   50:87   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  103:97   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  147:40   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 6 problems (6 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/Tools/tools-repository.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Tools\tools-repository.ts
  14:60  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  25:91  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  37:76  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  38:27  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  48:79  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 5 problems (5 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/UserInstructions/user-instructions-repository.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\UserInstructions\user-instructions-repository.ts
  13:71  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  24:20  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  42:46  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  86:40  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  89:30  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 5 problems (5 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/Persona/persona-schema.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Persona\persona-schema.ts
    2:33  error  'SeedPersona' is defined but never used         @typescript-eslint/no-unused-vars
    2:46  error  'SeedToolPermission' is defined but never used  @typescript-eslint/no-unused-vars
  221:48  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/AIProvider/ai-provider-schema.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\AIProvider\ai-provider-schema.ts
  110:9   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  111:38  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/AIProvider/ai-provider-service.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\AIProvider\ai-provider-service.ts
  6:3  error  'LLMChatProviderConfig' is defined but never used   @typescript-eslint/no-unused-vars
  7:3  error  'LLMEmbedProviderConfig' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/Auth/auth-repository.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Auth\auth-repository.ts
  20:55  error  'GlobalPermissions' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== TYPE ERRORS FOR FILE: src/backend/db/Auth/auth-repository.ts ===
src/backend/db/Auth/auth-repository.ts(90,20): error TS2571: Object is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(99,20): error TS2571: Object is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(124,20): error TS2571: Object is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(190,9): error TS2571: Object is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(234,21): error TS2571: Object is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(235,25): error TS7006: Parameter 'result' implicitly has an 'any' type.
src/backend/db/Auth/auth-repository.ts(242,74): error TS2339: Property 'all' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(250,20): error TS2571: Object is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(253,28): error TS2571: Object is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(294,36): error TS2571: Object is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(300,9): error TS2571: Object is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(317,34): error TS2571: Object is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(322,9): error TS2571: Object is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(392,7): error TS2571: Object is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(413,7): error TS2571: Object is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(420,7): error TS2571: Object is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(427,7): error TS2571: Object is of type 'unknown'.


=== TYPE ERRORS FOR FILE: src/backend/db/Auth/auth-repository.ts ===
src/backend/db/Auth/auth-repository.ts(90,20): error TS2571: Object is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(99,20): error TS2571: Object is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(124,20): error TS2571: Object is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(190,9): error TS2571: Object is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(234,21): error TS2571: Object is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(235,25): error TS7006: Parameter 'result' implicitly has an 'any' type.
src/backend/db/Auth/auth-repository.ts(242,74): error TS2339: Property 'all' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(250,20): error TS2571: Object is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(253,28): error TS2571: Object is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(294,36): error TS2571: Object is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(300,9): error TS2571: Object is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(317,34): error TS2571: Object is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(322,9): error TS2571: Object is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(392,7): error TS2571: Object is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(413,7): error TS2571: Object is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(420,7): error TS2571: Object is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(427,7): error TS2571: Object is of type 'unknown'.


=== TYPE ERRORS FOR FILE: src/backend/db/Auth/auth-repository.ts ===
src/backend/db/Auth/auth-repository.ts(91,20): error TS2532: Object is possibly 'undefined'.
src/backend/db/Auth/auth-repository.ts(100,20): error TS2532: Object is possibly 'undefined'.
src/backend/db/Auth/auth-repository.ts(103,34): error TS2339: Property 'id' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(104,27): error TS2339: Property 'name' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(105,32): error TS2339: Property 'name' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(110,21): error TS2339: Property 'email' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(111,20): error TS2339: Property 'role' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(112,23): error TS2339: Property 'status' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(113,22): error TS2339: Property 'avatar' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(114,24): error TS2339: Property 'last_seen' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(114,52): error TS2339: Property 'last_seen' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(115,25): error TS2339: Property 'created_at' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(115,54): error TS2339: Property 'created_at' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(116,28): error TS2339: Property 'password_hash' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(117,42): error TS2339: Property 'must_change_password' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(118,39): error TS2339: Property 'developer_mode' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(125,20): error TS2532: Object is possibly 'undefined'.
src/backend/db/Auth/auth-repository.ts(128,34): error TS2339: Property 'id' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(129,26): error TS2339: Property 'name' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(130,32): error TS2339: Property 'name' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(135,21): error TS2339: Property 'email' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(136,20): error TS2339: Property 'role' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(137,23): error TS2339: Property 'status' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(138,22): error TS2339: Property 'avatar' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(139,24): error TS2339: Property 'last_seen' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(139,52): error TS2339: Property 'last_seen' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(140,25): error TS2339: Property 'created_at' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(140,54): error TS2339: Property 'created_at' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(141,28): error TS2339: Property 'password_hash' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(142,42): error TS2339: Property 'must_change_password' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(143,39): error TS2339: Property 'developer_mode' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(191,9): error TS2532: Object is possibly 'undefined'.
src/backend/db/Auth/auth-repository.ts(235,21): error TS2532: Object is possibly 'undefined'.
src/backend/db/Auth/auth-repository.ts(251,20): error TS2532: Object is possibly 'undefined'.
src/backend/db/Auth/auth-repository.ts(254,28): error TS2532: Object is possibly 'undefined'.
src/backend/db/Auth/auth-repository.ts(259,35): error TS2339: Property 'canLaunchApps' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(260,37): error TS2339: Property 'canTeardownApps' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(261,35): error TS2339: Property 'canUpdateApps' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(262,33): error TS2339: Property 'canViewLogs' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(263,36): error TS2339: Property 'canManageUsers' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(264,35): error TS2339: Property 'canDeleteApps' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(265,35): error TS2339: Property 'canManageApps' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(266,35): error TS2339: Property 'canCreateApps' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(267,35): error TS2339: Property 'canModifyTags' does not exist on type '{}'.
src/backend/db/Auth/auth-repository.ts(277,16): error TS18046: 'perm' is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(278,22): error TS18046: 'perm' is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(279,24): error TS18046: 'perm' is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(280,22): error TS18046: 'perm' is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(281,24): error TS18046: 'perm' is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(282,26): error TS18046: 'perm' is of type 'unknown'.
src/backend/db/Auth/auth-repository.ts(295,36): error TS2532: Object is possibly 'undefined'.
src/backend/db/Auth/auth-repository.ts(301,9): error TS2532: Object is possibly 'undefined'.
src/backend/db/Auth/auth-repository.ts(318,34): error TS2532: Object is possibly 'undefined'.
src/backend/db/Auth/auth-repository.ts(323,9): error TS2532: Object is possibly 'undefined'.
src/backend/db/Auth/auth-repository.ts(393,7): error TS2532: Object is possibly 'undefined'.
src/backend/db/Auth/auth-repository.ts(414,7): error TS2532: Object is possibly 'undefined'.
src/backend/db/Auth/auth-repository.ts(421,7): error TS2532: Object is possibly 'undefined'.
src/backend/db/Auth/auth-repository.ts(428,7): error TS2532: Object is possibly 'undefined'.


=== TYPE ERRORS FOR FILE: src/backend/db/Apps/apps-repository.ts ===
src/backend/db/Apps/apps-repository.ts(219,67): error TS2339: Property 'get' does not exist on type '{}'.
src/backend/db/Apps/apps-repository.ts(230,69): error TS2339: Property 'get' does not exist on type '{}'.
src/backend/db/Apps/apps-repository.ts(240,66): error TS2339: Property 'all' does not exist on type '{}'.
src/backend/db/Apps/apps-repository.ts(249,70): error TS2339: Property 'all' does not exist on type '{}'.
src/backend/db/Apps/apps-repository.ts(259,70): error TS2339: Property 'all' does not exist on type '{}'.
src/backend/db/Apps/apps-repository.ts(273,7): error TS2571: Object is of type 'unknown'.
src/backend/db/Apps/apps-repository.ts(305,7): error TS2571: Object is of type 'unknown'.
src/backend/db/Apps/apps-repository.ts(335,7): error TS2571: Object is of type 'unknown'.
src/backend/db/Apps/apps-repository.ts(410,7): error TS2322: Type 'string | null' is not assignable to type 'string | undefined'.
src/backend/db/Apps/apps-repository.ts(415,7): error TS2322: Type 'number | null' is not assignable to type 'number | undefined'.
src/backend/db/Apps/apps-repository.ts(437,7): error TS2322: Type 'string | null' is not assignable to type 'string | undefined'.


=== TYPE ERRORS FOR FILE: src/backend/db/Persona/persona-repository.ts ===
src/backend/db/Persona/persona-repository.ts(66,7): error TS2571: Object is of type 'unknown'.
src/backend/db/Persona/persona-repository.ts(88,7): error TS2571: Object is of type 'unknown'.
src/backend/db/Persona/persona-repository.ts(111,7): error TS2571: Object is of type 'unknown'.
src/backend/db/Persona/persona-repository.ts(126,74): error TS2339: Property 'get' does not exist on type '{}'.
src/backend/db/Persona/persona-repository.ts(138,76): error TS2339: Property 'get' does not exist on type '{}'.
src/backend/db/Persona/persona-repository.ts(149,73): error TS2339: Property 'all' does not exist on type '{}'.
src/backend/db/Persona/persona-repository.ts(160,82): error TS2339: Property 'all' does not exist on type '{}'.
src/backend/db/Persona/persona-repository.ts(172,88): error TS2339: Property 'all' does not exist on type '{}'.


=== LINT ERRORS FOR FILE: src/backend/db/Apps/apps-schema.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Apps\apps-schema.ts
  177:7   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  179:32  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/Command/command-schema.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Command\command-schema.ts
  52:49  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  52:86  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/ContextSettings/context-settings-schema.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\ContextSettings\context-settings-schema.ts
  81:9   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  82:43  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/MCPServers/mcp-servers-schema.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\MCPServers\mcp-servers-schema.ts
  253:51  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  253:91  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/Tools/tools-schema.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Tools\tools-schema.ts
  85:7   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  86:33  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/UserInstructions/user-instructions-schema.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\UserInstructions\user-instructions-schema.ts
  34:57   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  34:103  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/AIProvider/ai-provider-repository.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\AIProvider\ai-provider-repository.ts
  22:65  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/DatabaseManager.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\DatabaseManager.ts
  44:5  error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/MCPServers/mcp-servers-service.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\MCPServers\mcp-servers-service.ts
  42:68  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/Repository.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Repository.ts
  4:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/ai/provider-service.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\ai\provider-service.ts
   10:10  error  'Parser' is defined but never used                      @typescript-eslint/no-unused-vars
   11:10  error  'AgentResponse' is defined but never used               @typescript-eslint/no-unused-vars
   11:25  error  'AgentResponseParser' is defined but never used         @typescript-eslint/no-unused-vars
   11:46  error  'SlashCommandContext' is defined but never used         @typescript-eslint/no-unused-vars
   23:3   error  'Persona' is defined but never used                     @typescript-eslint/no-unused-vars
   30:3   error  'PersonaSwitchedEventData' is defined but never used    @typescript-eslint/no-unused-vars
   33:3   error  'ChatMessageHandlerResponse' is defined but never used  @typescript-eslint/no-unused-vars
   34:3   error  'StopRequestData' is defined but never used             @typescript-eslint/no-unused-vars
   35:3   error  'FILE_PATHS' is defined but never used                  @typescript-eslint/no-unused-vars
   36:3   error  'StreamingDelta' is defined but never used              @typescript-eslint/no-unused-vars
   37:3   error  'StreamingDone' is defined but never used               @typescript-eslint/no-unused-vars
   39:3   error  'MCPToolCall' is defined but never used                 @typescript-eslint/no-unused-vars
   40:3   error  'ChatResponseData' is defined but never used            @typescript-eslint/no-unused-vars
   41:3   error  'ParsedModelOutput' is defined but never used           @typescript-eslint/no-unused-vars
   43:29  error  'AIProviderService' is defined but never used           @typescript-eslint/no-unused-vars
   44:10  error  'fileHelpers' is defined but never used                 @typescript-eslint/no-unused-vars
   46:10  error  'Chat' is defined but never used                        @typescript-eslint/no-unused-vars
   49:10  error  'PersonaService' is defined but never used              @typescript-eslint/no-unused-vars
   50:10  error  'CommandService' is defined but never used              @typescript-eslint/no-unused-vars
  357:41  error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  357:75  error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  361:81  error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  369:56  error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any

✖ 23 problems (23 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/ai/providers/openai-provider.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\ai\providers\openai-provider.ts
   15:3   error  'MCPToolSchema' is defined but never used     @typescript-eslint/no-unused-vars
   16:3   error  'PersonaReasoning' is defined but never used  @typescript-eslint/no-unused-vars
  107:47  error  Unexpected any. Specify a different type      @typescript-eslint/no-explicit-any
  119:36  error  Unexpected any. Specify a different type      @typescript-eslint/no-explicit-any
  171:26  error  Unexpected any. Specify a different type      @typescript-eslint/no-explicit-any
  172:29  error  Unexpected any. Specify a different type      @typescript-eslint/no-explicit-any
  236:44  error  Unexpected any. Specify a different type      @typescript-eslint/no-explicit-any
  328:21  error  Unexpected any. Specify a different type      @typescript-eslint/no-explicit-any
  400:56  error  Unexpected any. Specify a different type      @typescript-eslint/no-explicit-any
  403:10  error  Unexpected any. Specify a different type      @typescript-eslint/no-explicit-any
  406:65  error  Unexpected any. Specify a different type      @typescript-eslint/no-explicit-any

✖ 11 problems (11 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/ai/providers/lm-studio-provider.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\ai\providers\lm-studio-provider.ts
   14:3   error  'MCPToolSchema' is defined but never used  @typescript-eslint/no-unused-vars
  139:54  error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
  152:44  error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
  259:50  error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
  293:51  error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any

✖ 5 problems (5 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/ai/providers/ollama-provider.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\ai\providers\ollama-provider.ts
   95:21  error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  149:56  error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  193:51  error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  236:54  error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  242:5   error  'retryCount' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 5 problems (5 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/ai/providers/open-ai/chat-helper.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\ai\providers\open-ai\chat-helper.ts
  10:10  error  'flattenZodObject' is defined but never used  @typescript-eslint/no-unused-vars
  49:52  error  Unexpected any. Specify a different type      @typescript-eslint/no-explicit-any
  50:28  error  Unexpected any. Specify a different type      @typescript-eslint/no-explicit-any

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/ai/structural-tools/tile-word-grid-submit-move-tool.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\ai\structural-tools\tile-word-grid-submit-move-tool.ts
  1:10  error  'z' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/chat/utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\chat\utils.ts
    2:10   error  'Parser' is defined but never used                      @typescript-eslint/no-unused-vars
    4:37   error  'StopRequestData' is defined but never used             @typescript-eslint/no-unused-vars
    4:76   error  'PersonaSwitchedEventData' is defined but never used    @typescript-eslint/no-unused-vars
    4:127  error  'ChatMessageHandlerResponse' is defined but never used  @typescript-eslint/no-unused-vars
    4:196  error  'MCPToolCall' is defined but never used                 @typescript-eslint/no-unused-vars
    4:219  error  'MCPToolResponse' is defined but never used             @typescript-eslint/no-unused-vars
    5:10   error  'SOCKET_EVENTS' is defined but never used               @typescript-eslint/no-unused-vars
  315:5    error  'io' is defined but never used                          @typescript-eslint/no-unused-vars
  316:5    error  'sessionId' is defined but never used                   @typescript-eslint/no-unused-vars
  325:83   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  349:41   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  349:75   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  353:81   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any

✖ 13 problems (13 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/chat/stream-chat-manager.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\chat\stream-chat-manager.ts
  16:3  error  'ParsedModelOutput' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/AppDatabaseService.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\AppDatabaseService.ts
    1:8    error  'betterSqlite3' is defined but never used         @typescript-eslint/no-unused-vars
    2:13   error  'fs' is defined but never used                    @typescript-eslint/no-unused-vars
    3:13   error  'path' is defined but never used                  @typescript-eslint/no-unused-vars
    4:296  error  'RESERVED_TABLES' is defined but never used       @typescript-eslint/no-unused-vars
    4:313  error  'MAX_SELECT_ROWS' is defined but never used       @typescript-eslint/no-unused-vars
    6:30   error  'STANDARD_TABLE_NAMES' is defined but never used  @typescript-eslint/no-unused-vars
  375:19   error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  417:19   error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  475:17   error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  494:35   error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  521:9    error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  523:29   error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any

✖ 12 problems (12 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/AppManager.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\AppManager.ts
    1:10  error  'spawn' is defined but never used                   @typescript-eslint/no-unused-vars
    1:17  error  'exec' is defined but never used                    @typescript-eslint/no-unused-vars
    1:37  error  'ExecException' is defined but never used           @typescript-eslint/no-unused-vars
    2:8   error  'pathModule' is defined but never used              @typescript-eslint/no-unused-vars
    3:10  error  'promisify' is defined but never used               @typescript-eslint/no-unused-vars
    5:10  error  'RoleManager' is defined but never used             @typescript-eslint/no-unused-vars
    8:33  error  'RuntimeApp' is defined but never used              @typescript-eslint/no-unused-vars
   32:7   error  'AppError' is defined but never used                @typescript-eslint/no-unused-vars
   53:11  error  'ResourceLimits' is defined but never used          @typescript-eslint/no-unused-vars
   68:46  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
   69:3   error  'utilPromisify' is assigned a value but never used  @typescript-eslint/no-unused-vars
   69:41  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
  110:32  error  'limits' is defined but never used                  @typescript-eslint/no-unused-vars

✖ 13 problems (13 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/AppDatabaseManager.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\AppDatabaseManager.ts
   27:12  error  'error' is defined but never used         @typescript-eslint/no-unused-vars
   65:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  103:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  121:18  error  'error' is defined but never used         @typescript-eslint/no-unused-vars
  127:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  141:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 6 problems (6 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/middleware/auth.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\middleware\auth.ts
   12:26  error  'AuthResponseData' is defined but never used  @typescript-eslint/no-unused-vars
   34:20  error  Unexpected any. Specify a different type      @typescript-eslint/no-explicit-any
  115:3   error  'appId' is defined but never used             @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\server.ts
  61:41  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  74:49  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/auth/google-oidc-service.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\auth\google-oidc-service.ts
  1:10  error  'randomBytes' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/chroma/provider-embed.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\chroma\provider-embed.ts
  21:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/apps/utils/app-manager-base-handlers.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\apps\utils\app-manager-base-handlers.ts
    2:10  error  'VSCodeLogger' is defined but never used                                                                    @typescript-eslint/no-unused-vars
    4:3   error  'MCPToolInterface' is defined but never used                                                                @typescript-eslint/no-unused-vars
   10:3   error  'createAppSchemaFields' is defined but never used                                                           @typescript-eslint/no-unused-vars
   11:3   error  'getAppSchemaFields' is defined but never used                                                              @typescript-eslint/no-unused-vars
   12:3   error  'getAppsSchemaFields' is defined but never used                                                             @typescript-eslint/no-unused-vars
   13:3   error  'updateAppSchemaFields' is defined but never used                                                           @typescript-eslint/no-unused-vars
   14:3   error  'deleteAppSchemaFields' is defined but never used                                                           @typescript-eslint/no-unused-vars
   15:3   error  'addTableSchemaFields' is defined but never used                                                            @typescript-eslint/no-unused-vars
   16:3   error  'removeTableSchemaFields' is defined but never used                                                         @typescript-eslint/no-unused-vars
   17:3   error  'addColumnSchemaFields' is defined but never used                                                           @typescript-eslint/no-unused-vars
   18:3   error  'removeColumnSchemaFields' is defined but never used                                                        @typescript-eslint/no-unused-vars
   19:3   error  'selectSchemaFields' is defined but never used                                                              @typescript-eslint/no-unused-vars
   20:3   error  'insertSchemaFields' is defined but never used                                                              @typescript-eslint/no-unused-vars
   21:3   error  'updateSchemaFields' is defined but never used                                                              @typescript-eslint/no-unused-vars
   22:3   error  'deleteSchemaFields' is defined but never used                                                              @typescript-eslint/no-unused-vars
   23:3   error  'executeRawSchemaFields' is defined but never used                                                          @typescript-eslint/no-unused-vars
   32:8   error  'z' is defined but never used                                                                               @typescript-eslint/no-unused-vars
   39:10  error  'STANDARD_TABLE_NAMES' is defined but never used                                                            @typescript-eslint/no-unused-vars
  388:52  error  Optional chain expressions can return undefined by design - using a non-null assertion is unsafe and wrong  @typescript-eslint/no-non-null-asserted-optional-chain
  393:60  error  Optional chain expressions can return undefined by design - using a non-null assertion is unsafe and wrong  @typescript-eslint/no-non-null-asserted-optional-chain
  394:56  error  Optional chain expressions can return undefined by design - using a non-null assertion is unsafe and wrong  @typescript-eslint/no-non-null-asserted-optional-chain
  395:58  error  Optional chain expressions can return undefined by design - using a non-null assertion is unsafe and wrong  @typescript-eslint/no-non-null-asserted-optional-chain
  400:61  error  Optional chain expressions can return undefined by design - using a non-null assertion is unsafe and wrong  @typescript-eslint/no-non-null-asserted-optional-chain
  401:55  error  Optional chain expressions can return undefined by design - using a non-null assertion is unsafe and wrong  @typescript-eslint/no-non-null-asserted-optional-chain
  402:57  error  Optional chain expressions can return undefined by design - using a non-null assertion is unsafe and wrong  @typescript-eslint/no-non-null-asserted-optional-chain

✖ 25 problems (25 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-server-providers/stdio-provider.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-server-providers\stdio-provider.ts
    1:48  error  'MCPServerUpdateEventData' is defined but never used  @typescript-eslint/no-unused-vars
    1:91  error  'SOCKET_EVENTS' is defined but never used             @typescript-eslint/no-unused-vars
    5:10  error  'spawn' is defined but never used                     @typescript-eslint/no-unused-vars
    5:17  error  'exec' is defined but never used                      @typescript-eslint/no-unused-vars
    5:23  error  'ChildProcess' is defined but never used              @typescript-eslint/no-unused-vars
    5:37  error  'ExecException' is defined but never used             @typescript-eslint/no-unused-vars
   17:46  error  Unexpected any. Specify a different type              @typescript-eslint/no-explicit-any
   18:3   error  'utilPromisify' is assigned a value but never used    @typescript-eslint/no-unused-vars
   18:41  error  Unexpected any. Specify a different type              @typescript-eslint/no-explicit-any
   35:88  error  Unexpected any. Specify a different type              @typescript-eslint/no-explicit-any
   97:25  error  Unexpected any. Specify a different type              @typescript-eslint/no-explicit-any
  198:74  error  Unexpected any. Specify a different type              @typescript-eslint/no-explicit-any
  198:88  error  Unexpected any. Specify a different type              @typescript-eslint/no-explicit-any
  216:11  error  'timeoutId' is never reassigned. Use 'const' instead  prefer-const
  235:20  error  'e' is defined but never used                         @typescript-eslint/no-unused-vars
  267:16  error  'err' is defined but never used                       @typescript-eslint/no-unused-vars
  267:21  error  Unexpected any. Specify a different type              @typescript-eslint/no-explicit-any

✖ 17 problems (17 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-server-providers/streamable-http-provider.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-server-providers\streamable-http-provider.ts
    4:17   error  'AxiosInstance' is defined but never used  @typescript-eslint/no-unused-vars
    4:32   error  'AxiosResponse' is defined but never used  @typescript-eslint/no-unused-vars
   19:88   error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
   19:102  error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
   58:19   error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
   71:25   error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
  123:14   error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
  158:13   error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
  159:14   error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
  161:14   error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
  175:21   error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any

✖ 11 problems (11 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/todo-list/todo-list-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\todo-list\todo-list-mcp-server.ts
   95:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars
  137:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars
  146:59  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  181:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars
  221:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars
  230:59  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  258:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars
  287:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars
  315:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars
  338:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars
  366:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars

✖ 11 problems (11 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-server-loader.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-server-loader.ts
   22:66   error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  185:76   error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  193:21   error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  213:35   error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  213:106  error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  217:42   error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  219:11   error  Unexpected aliasing of 'this' to local variable  @typescript-eslint/no-this-alias
  222:72   error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  248:80   error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  283:36   error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any

✖ 10 problems (10 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-tool.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-tool.ts
  29:59  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  33:63  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  54:42  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  76:12  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  81:40  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  89:74  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  90:56  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 7 problems (7 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/apps/app-management-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\apps\app-management-mcp-server.ts
   43:446  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   61:38   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   79:51   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   97:450  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  116:38   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 5 problems (5 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/file/utils/mcp-file-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\file\utils\mcp-file-utils.ts
    1:10  error  'z' is defined but never used                       @typescript-eslint/no-unused-vars
   40:22  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
   97:22  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
  163:7   error  'operationName' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/file/update-file-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\file\update-file-mcp-server.ts
   2:8  error  'fs' is defined but never used                   @typescript-eslint/no-unused-vars
   3:8  error  'path' is defined but never used                 @typescript-eslint/no-unused-vars
  24:7  error  'getHeaders' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/ui-automation/ui-automation-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\ui-automation\ui-automation-mcp-server.ts
   81:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  102:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars
  102:23  error  'persona' is defined but never used       @typescript-eslint/no-unused-vars
  153:18  error  'error' is defined but never used         @typescript-eslint/no-unused-vars

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/utils/mcp-tool-adapter.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\utils\mcp-tool-adapter.ts
  15:57  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  23:20  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  35:37  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  50:25  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/documentation/documentor-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\documentation\documentor-mcp-server.ts
  12:15  error  'DiffPatch' is defined but never used  @typescript-eslint/no-unused-vars
  51:14  error  'err' is defined but never used        @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/command/run-terminal-command-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\command\run-terminal-command-mcp-server.ts
   2:10  error  'z' is defined but never used            @typescript-eslint/no-unused-vars
  34:22  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/directory/create-directory-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\directory\create-directory-mcp-server.ts
  2:10  error  'z' is defined but never used     @typescript-eslint/no-unused-vars
  4:8   error  'path' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/directory/remove-directory-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\directory\remove-directory-mcp-server.ts
   3:8   error  'path' is defined but never used          @typescript-eslint/no-unused-vars
  40:37  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/file/read-file-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\file\read-file-mcp-server.ts
  3:8  error  'path' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/file/remove-file-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\file\remove-file-mcp-server.ts
  26:11  error  'pathModule' is assigned a value but never used  @typescript-eslint/no-unused-vars
  34:16  error  'accessError' is defined but never used          @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/persona/utils/persona-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\persona\utils\persona-utils.ts
  2:10   error  'ChatPersona' is defined but never used   @typescript-eslint/no-unused-vars
  2:105  error  'TodoItemType' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/search/search-repository-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\search\search-repository-mcp-server.ts
  32:5  error  'normalizedPath' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/search/utils/SearchHelper.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\search\utils\SearchHelper.ts
    3:10  error  'isExcludedDir' is defined but never used  @typescript-eslint/no-unused-vars
  147:14  error  'error' is defined but never used          @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-server-providers/types.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-server-providers\types.ts
  7:84  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/awaiter/utils/awaiter-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\awaiter\utils\awaiter-utils.ts
  2:27  error  'SOCKET_EVENTS' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/followup/followup-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\followup\followup-mcp-server.ts
  49:20  error  'error' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/routes/utils/auth-routes-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\routes\utils\auth-routes-utils.ts
    1:25  error  'RawSocket' is defined but never used     @typescript-eslint/no-unused-vars
   18:3   error  'ToolsList' is defined but never used     @typescript-eslint/no-unused-vars
   38:8   error  'toolsService' is defined but never used  @typescript-eslint/no-unused-vars
  110:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  137:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  163:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  210:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  249:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  277:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  306:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  351:12  error  'error' is defined but never used         @typescript-eslint/no-unused-vars
  351:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  455:12  error  'error' is defined but never used         @typescript-eslint/no-unused-vars
  455:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  462:60  error  'data' is defined but never used          @typescript-eslint/no-unused-vars
  475:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  496:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  555:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 18 problems (18 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/routes/authRoutes.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\routes\authRoutes.ts
  10:25  error  'RawSocket' is defined but never used           @typescript-eslint/no-unused-vars
  11:16  error  'UserRole' is defined but never used            @typescript-eslint/no-unused-vars
  11:26  error  'AuthResponseData' is defined but never used    @typescript-eslint/no-unused-vars
  11:44  error  'UpdateUserData' is defined but never used      @typescript-eslint/no-unused-vars
  11:60  error  'GlobalPermissions' is defined but never used   @typescript-eslint/no-unused-vars
  11:79  error  'AppPermission' is defined but never used       @typescript-eslint/no-unused-vars
  13:10  error  'RoleManager' is defined but never used         @typescript-eslint/no-unused-vars
  14:10  error  'getRoleManager' is defined but never used      @typescript-eslint/no-unused-vars
  15:8   error  'userService' is defined but never used         @typescript-eslint/no-unused-vars
  15:23  error  'UserService' is defined but never used         @typescript-eslint/no-unused-vars
  23:3   error  'AuthStateEventData' is defined but never used  @typescript-eslint/no-unused-vars
  26:3   error  'ResponseData' is defined but never used        @typescript-eslint/no-unused-vars
  27:3   error  'FindUserData' is defined but never used        @typescript-eslint/no-unused-vars
  33:3   error  'FindByEmailData' is defined but never used     @typescript-eslint/no-unused-vars

✖ 14 problems (14 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/routes/platform-app-seed-data.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\routes\platform-app-seed-data.ts
  115:16  error  'postAppSeedAction' is defined but never used    @typescript-eslint/no-unused-vars
  149:10  error  'parseSeedActionBody' is defined but never used  @typescript-eslint/no-unused-vars
  173:16  error  'resolveAppServerUrl' is defined but never used  @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/mcp-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\mcp-utils.ts
   14:3    error  'addTodoItemSchemaFields' is defined but never used     @typescript-eslint/no-unused-vars
   31:26   error  'MAX_CONSECUTIVE_FAILURES' is defined but never used    @typescript-eslint/no-unused-vars
   72:96   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
   74:93   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
   75:57   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
   90:41   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  189:105  error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  447:15   error  'toolResultWrapped' is assigned a value but never used  @typescript-eslint/no-unused-vars
  586:23   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any

✖ 9 problems (9 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/template-resolvers/persona-resolver.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\template-resolvers\persona-resolver.ts
  12:3  error  '_isDeveloperMode' is defined but never used  @typescript-eslint/no-unused-vars
  13:3  error  '_providerData' is defined but never used     @typescript-eslint/no-unused-vars
  14:3  error  '_templateData' is defined but never used     @typescript-eslint/no-unused-vars
  31:3  error  '_sessionId' is defined but never used        @typescript-eslint/no-unused-vars
  32:3  error  '_persona' is defined but never used          @typescript-eslint/no-unused-vars
  33:3  error  '_isDeveloperMode' is defined but never used  @typescript-eslint/no-unused-vars
  34:3  error  '_providerData' is defined but never used     @typescript-eslint/no-unused-vars
  35:3  error  '_templateData' is defined but never used     @typescript-eslint/no-unused-vars

✖ 8 problems (8 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/type-script-validator.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\type-script-validator.ts
   1:10  error  'spawn' is defined but never used                   @typescript-eslint/no-unused-vars
  16:5   error  'utilPromisify' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/app-database-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\app-database-utils.ts
   43:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   59:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   71:78  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   76:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   93:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  165:27  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  184:41  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 7 problems (7 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/lint-file.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\lint-file.ts
   1:10  error  'spawn' is defined but never used                   @typescript-eslint/no-unused-vars
   1:17  error  'exec' is defined but never used                    @typescript-eslint/no-unused-vars
   1:23  error  'ChildProcess' is defined but never used            @typescript-eslint/no-unused-vars
   1:37  error  'ExecException' is defined but never used           @typescript-eslint/no-unused-vars
  15:48  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
  16:5   error  'utilPromisify' is assigned a value but never used  @typescript-eslint/no-unused-vars
  16:43  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any

✖ 7 problems (7 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/agent-response-parser.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\agent-response-parser.ts
  173:49  error  The `Function` type accepts any function-like value.
Prefer explicitly defining any function parameters and return type  @typescript-eslint/no-unsafe-function-type
  446:37  error  The `Function` type accepts any function-like value.
Prefer explicitly defining any function parameters and return type  @typescript-eslint/no-unsafe-function-type
  453:39  error  The `Function` type accepts any function-like value.
Prefer explicitly defining any function parameters and return type  @typescript-eslint/no-unsafe-function-type
  474:37  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
  490:44  error  The `Function` type accepts any function-like value.
Prefer explicitly defining any function parameters and return type  @typescript-eslint/no-unsafe-function-type

✖ 5 problems (5 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/logger.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\logger.ts
    3:20  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
    4:22  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
    5:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  146:31  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/file-helpers.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\file-helpers.ts
  11:25  error  'ICommand' is defined but never used                    @typescript-eslint/no-unused-vars
  16:3   error  'getRepoFileIndexGeneration' is defined but never used  @typescript-eslint/no-unused-vars
  17:3   error  'isRepoFileIndexFresh' is defined but never used        @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/failure-tracker.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\failure-tracker.ts
    1:10  error  'MCPToolResponse' is defined but never used        @typescript-eslint/no-unused-vars
  169:17  error  'compositeKey' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/mcp-production-enforcer.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\mcp-production-enforcer.ts
   8:3   error  'resolveTargetAppIdsFromToolParams' is defined but never used  @typescript-eslint/no-unused-vars
  40:38  error  Unexpected any. Specify a different type                       @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/parse-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\parse-utils.ts
  1:33  error  'MCPToolCall' is defined but never used    @typescript-eslint/no-unused-vars
  2:10  error  'AgentResponse' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/template-manager.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\template-manager.ts
  121:11  error  'nativeToolCalls' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/tool-call-execution-context.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\tool-call-execution-context.ts
  106:22  error  '_removed' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/Apps/apps-schema.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Apps\apps-schema.ts
  177:7   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  179:32  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/Command/command-schema.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Command\command-schema.ts
  52:49  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  52:86  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/ContextSettings/context-settings-schema.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\ContextSettings\context-settings-schema.ts
  81:9   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  82:43  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/MCPServers/mcp-servers-schema.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\MCPServers\mcp-servers-schema.ts
  253:51  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  253:91  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/Tools/tools-schema.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Tools\tools-schema.ts
  85:7   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  86:33  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/UserInstructions/user-instructions-schema.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\UserInstructions\user-instructions-schema.ts
  34:57   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  34:103  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/AIProvider/ai-provider-repository.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\AIProvider\ai-provider-repository.ts
  22:65  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/DatabaseManager.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\DatabaseManager.ts
  44:5  error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/MCPServers/mcp-servers-service.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\MCPServers\mcp-servers-service.ts
  42:68  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/Repository.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\Repository.ts
  4:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 1 problem (1 error, 0 warnings)


=== TYPE ERRORS FOR FILE: src/backend/db/DatabaseManager.ts ===
src/backend/db/DatabaseManager.ts(44,5): error TS2578: Unused '@ts-expect-error' directive.


=== LINT ERRORS FOR FILE: src/backend/ai/provider-service.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\ai\provider-service.ts
   10:10  error  'Parser' is defined but never used                      @typescript-eslint/no-unused-vars
   11:10  error  'AgentResponse' is defined but never used               @typescript-eslint/no-unused-vars
   11:25  error  'AgentResponseParser' is defined but never used         @typescript-eslint/no-unused-vars
   11:46  error  'SlashCommandContext' is defined but never used         @typescript-eslint/no-unused-vars
   23:3   error  'Persona' is defined but never used                     @typescript-eslint/no-unused-vars
   30:3   error  'PersonaSwitchedEventData' is defined but never used    @typescript-eslint/no-unused-vars
   33:3   error  'ChatMessageHandlerResponse' is defined but never used  @typescript-eslint/no-unused-vars
   34:3   error  'StopRequestData' is defined but never used             @typescript-eslint/no-unused-vars
   35:3   error  'FILE_PATHS' is defined but never used                  @typescript-eslint/no-unused-vars
   36:3   error  'StreamingDelta' is defined but never used              @typescript-eslint/no-unused-vars
   37:3   error  'StreamingDone' is defined but never used               @typescript-eslint/no-unused-vars
   39:3   error  'MCPToolCall' is defined but never used                 @typescript-eslint/no-unused-vars
   40:3   error  'ChatResponseData' is defined but never used            @typescript-eslint/no-unused-vars
   41:3   error  'ParsedModelOutput' is defined but never used           @typescript-eslint/no-unused-vars
   43:29  error  'AIProviderService' is defined but never used           @typescript-eslint/no-unused-vars
   44:10  error  'fileHelpers' is defined but never used                 @typescript-eslint/no-unused-vars
   46:10  error  'Chat' is defined but never used                        @typescript-eslint/no-unused-vars
   49:10  error  'PersonaService' is defined but never used              @typescript-eslint/no-unused-vars
   50:10  error  'CommandService' is defined but never used              @typescript-eslint/no-unused-vars
  357:41  error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  357:75  error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  361:81  error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  369:56  error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any

✖ 23 problems (23 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/ai/providers/openai-provider.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\ai\providers\openai-provider.ts
   15:3   error  'MCPToolSchema' is defined but never used     @typescript-eslint/no-unused-vars
   16:3   error  'PersonaReasoning' is defined but never used  @typescript-eslint/no-unused-vars
  107:47  error  Unexpected any. Specify a different type      @typescript-eslint/no-explicit-any
  119:36  error  Unexpected any. Specify a different type      @typescript-eslint/no-explicit-any
  171:26  error  Unexpected any. Specify a different type      @typescript-eslint/no-explicit-any
  172:29  error  Unexpected any. Specify a different type      @typescript-eslint/no-explicit-any
  236:44  error  Unexpected any. Specify a different type      @typescript-eslint/no-explicit-any
  328:21  error  Unexpected any. Specify a different type      @typescript-eslint/no-explicit-any
  400:56  error  Unexpected any. Specify a different type      @typescript-eslint/no-explicit-any
  403:10  error  Unexpected any. Specify a different type      @typescript-eslint/no-explicit-any
  406:65  error  Unexpected any. Specify a different type      @typescript-eslint/no-explicit-any

✖ 11 problems (11 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/ai/providers/lm-studio-provider.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\ai\providers\lm-studio-provider.ts
   14:3   error  'MCPToolSchema' is defined but never used  @typescript-eslint/no-unused-vars
  139:54  error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
  152:44  error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
  259:50  error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
  293:51  error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any

✖ 5 problems (5 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/ai/providers/ollama-provider.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\ai\providers\ollama-provider.ts
   95:21  error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  149:56  error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  193:51  error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  236:54  error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  242:5   error  'retryCount' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 5 problems (5 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/ai/providers/open-ai/chat-helper.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\ai\providers\open-ai\chat-helper.ts
  10:10  error  'flattenZodObject' is defined but never used  @typescript-eslint/no-unused-vars
  49:52  error  Unexpected any. Specify a different type      @typescript-eslint/no-explicit-any
  50:28  error  Unexpected any. Specify a different type      @typescript-eslint/no-explicit-any

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/ai/structural-tools/tile-word-grid-submit-move-tool.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\ai\structural-tools\tile-word-grid-submit-move-tool.ts
  1:10  error  'z' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/ai/providers/ollama-provider.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\ai\providers\ollama-provider.ts
  242:5  error  '_retryCount' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/chat/utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\chat\utils.ts
    2:10   error  'Parser' is defined but never used                      @typescript-eslint/no-unused-vars
    4:37   error  'StopRequestData' is defined but never used             @typescript-eslint/no-unused-vars
    4:76   error  'PersonaSwitchedEventData' is defined but never used    @typescript-eslint/no-unused-vars
    4:127  error  'ChatMessageHandlerResponse' is defined but never used  @typescript-eslint/no-unused-vars
    4:196  error  'MCPToolCall' is defined but never used                 @typescript-eslint/no-unused-vars
    4:219  error  'MCPToolResponse' is defined but never used             @typescript-eslint/no-unused-vars
    5:10   error  'SOCKET_EVENTS' is defined but never used               @typescript-eslint/no-unused-vars
  315:5    error  'io' is defined but never used                          @typescript-eslint/no-unused-vars
  316:5    error  'sessionId' is defined but never used                   @typescript-eslint/no-unused-vars
  325:83   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  349:41   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  349:75   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  353:81   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any

✖ 13 problems (13 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/chat/stream-chat-manager.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\chat\stream-chat-manager.ts
  16:3  error  'ParsedModelOutput' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/chat/utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\chat\utils.ts
  325:5  error  '_io' is defined but never used         @typescript-eslint/no-unused-vars
  326:5  error  '_sessionId' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/AppDatabaseService.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\AppDatabaseService.ts
    1:8    error  'betterSqlite3' is defined but never used         @typescript-eslint/no-unused-vars
    2:13   error  'fs' is defined but never used                    @typescript-eslint/no-unused-vars
    3:13   error  'path' is defined but never used                  @typescript-eslint/no-unused-vars
    4:296  error  'RESERVED_TABLES' is defined but never used       @typescript-eslint/no-unused-vars
    4:313  error  'MAX_SELECT_ROWS' is defined but never used       @typescript-eslint/no-unused-vars
    6:30   error  'STANDARD_TABLE_NAMES' is defined but never used  @typescript-eslint/no-unused-vars
  375:19   error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  417:19   error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  475:17   error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  494:35   error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  521:9    error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  523:29   error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any

✖ 12 problems (12 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/AppManager.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\AppManager.ts
    1:10  error  'spawn' is defined but never used                   @typescript-eslint/no-unused-vars
    1:17  error  'exec' is defined but never used                    @typescript-eslint/no-unused-vars
    1:37  error  'ExecException' is defined but never used           @typescript-eslint/no-unused-vars
    2:8   error  'pathModule' is defined but never used              @typescript-eslint/no-unused-vars
    3:10  error  'promisify' is defined but never used               @typescript-eslint/no-unused-vars
    5:10  error  'RoleManager' is defined but never used             @typescript-eslint/no-unused-vars
    8:33  error  'RuntimeApp' is defined but never used              @typescript-eslint/no-unused-vars
   32:7   error  'AppError' is defined but never used                @typescript-eslint/no-unused-vars
   53:11  error  'ResourceLimits' is defined but never used          @typescript-eslint/no-unused-vars
   68:46  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
   69:3   error  'utilPromisify' is assigned a value but never used  @typescript-eslint/no-unused-vars
   69:41  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
  110:32  error  'limits' is defined but never used                  @typescript-eslint/no-unused-vars

✖ 13 problems (13 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/AppDatabaseManager.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\AppDatabaseManager.ts
   27:12  error  'error' is defined but never used         @typescript-eslint/no-unused-vars
   65:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  103:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  121:18  error  'error' is defined but never used         @typescript-eslint/no-unused-vars
  127:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  141:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 6 problems (6 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/middleware/auth.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\middleware\auth.ts
   12:26  error  'AuthResponseData' is defined but never used  @typescript-eslint/no-unused-vars
   34:20  error  Unexpected any. Specify a different type      @typescript-eslint/no-explicit-any
  115:3   error  'appId' is defined but never used             @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\server.ts
  61:41  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  74:49  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/auth/google-oidc-service.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\auth\google-oidc-service.ts
  1:10  error  'randomBytes' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/chroma/provider-embed.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\chroma\provider-embed.ts
  21:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/AppDatabaseService.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\AppDatabaseService.ts
    1:8    error  'betterSqlite3' is defined but never used         @typescript-eslint/no-unused-vars
    2:13   error  'fs' is defined but never used                    @typescript-eslint/no-unused-vars
    3:13   error  'path' is defined but never used                  @typescript-eslint/no-unused-vars
    4:296  error  'RESERVED_TABLES' is defined but never used       @typescript-eslint/no-unused-vars
    4:313  error  'MAX_SELECT_ROWS' is defined but never used       @typescript-eslint/no-unused-vars
    6:30   error  'STANDARD_TABLE_NAMES' is defined but never used  @typescript-eslint/no-unused-vars
  375:19   error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  417:19   error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  475:17   error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  494:35   error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  521:9    error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  523:29   error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any

✖ 12 problems (12 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/AppManager.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\AppManager.ts
    1:10  error  'spawn' is defined but never used                   @typescript-eslint/no-unused-vars
    1:17  error  'exec' is defined but never used                    @typescript-eslint/no-unused-vars
    1:37  error  'ExecException' is defined but never used           @typescript-eslint/no-unused-vars
    2:8   error  'pathModule' is defined but never used              @typescript-eslint/no-unused-vars
    3:10  error  'promisify' is defined but never used               @typescript-eslint/no-unused-vars
    5:10  error  'RoleManager' is defined but never used             @typescript-eslint/no-unused-vars
    8:33  error  'RuntimeApp' is defined but never used              @typescript-eslint/no-unused-vars
   32:7   error  'AppError' is defined but never used                @typescript-eslint/no-unused-vars
   53:11  error  'ResourceLimits' is defined but never used          @typescript-eslint/no-unused-vars
   68:46  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
   69:3   error  'utilPromisify' is assigned a value but never used  @typescript-eslint/no-unused-vars
   69:41  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
  110:32  error  'limits' is defined but never used                  @typescript-eslint/no-unused-vars

✖ 13 problems (13 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/AppDatabaseManager.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\AppDatabaseManager.ts
   27:12  error  'error' is defined but never used         @typescript-eslint/no-unused-vars
   65:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  103:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  121:18  error  'error' is defined but never used         @typescript-eslint/no-unused-vars
  127:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  141:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 6 problems (6 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/middleware/auth.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\middleware\auth.ts
   12:26  error  'AuthResponseData' is defined but never used  @typescript-eslint/no-unused-vars
   34:20  error  Unexpected any. Specify a different type      @typescript-eslint/no-explicit-any
  115:3   error  'appId' is defined but never used             @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\server.ts
  61:41  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  74:49  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/auth/google-oidc-service.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\auth\google-oidc-service.ts
  1:10  error  'randomBytes' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/chroma/provider-embed.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\chroma\provider-embed.ts
  21:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/middleware/auth.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\middleware\auth.ts
  115:3  error  '_appId' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/middleware/auth.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\middleware\auth.ts
  115:3  error  '_appId' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/apps/utils/app-manager-base-handlers.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\apps\utils\app-manager-base-handlers.ts
    2:10  error  'VSCodeLogger' is defined but never used                                                                    @typescript-eslint/no-unused-vars
    4:3   error  'MCPToolInterface' is defined but never used                                                                @typescript-eslint/no-unused-vars
   10:3   error  'createAppSchemaFields' is defined but never used                                                           @typescript-eslint/no-unused-vars
   11:3   error  'getAppSchemaFields' is defined but never used                                                              @typescript-eslint/no-unused-vars
   12:3   error  'getAppsSchemaFields' is defined but never used                                                             @typescript-eslint/no-unused-vars
   13:3   error  'updateAppSchemaFields' is defined but never used                                                           @typescript-eslint/no-unused-vars
   14:3   error  'deleteAppSchemaFields' is defined but never used                                                           @typescript-eslint/no-unused-vars
   15:3   error  'addTableSchemaFields' is defined but never used                                                            @typescript-eslint/no-unused-vars
   16:3   error  'removeTableSchemaFields' is defined but never used                                                         @typescript-eslint/no-unused-vars
   17:3   error  'addColumnSchemaFields' is defined but never used                                                           @typescript-eslint/no-unused-vars
   18:3   error  'removeColumnSchemaFields' is defined but never used                                                        @typescript-eslint/no-unused-vars
   19:3   error  'selectSchemaFields' is defined but never used                                                              @typescript-eslint/no-unused-vars
   20:3   error  'insertSchemaFields' is defined but never used                                                              @typescript-eslint/no-unused-vars
   21:3   error  'updateSchemaFields' is defined but never used                                                              @typescript-eslint/no-unused-vars
   22:3   error  'deleteSchemaFields' is defined but never used                                                              @typescript-eslint/no-unused-vars
   23:3   error  'executeRawSchemaFields' is defined but never used                                                          @typescript-eslint/no-unused-vars
   32:8   error  'z' is defined but never used                                                                               @typescript-eslint/no-unused-vars
   39:10  error  'STANDARD_TABLE_NAMES' is defined but never used                                                            @typescript-eslint/no-unused-vars
  388:52  error  Optional chain expressions can return undefined by design - using a non-null assertion is unsafe and wrong  @typescript-eslint/no-non-null-asserted-optional-chain
  393:60  error  Optional chain expressions can return undefined by design - using a non-null assertion is unsafe and wrong  @typescript-eslint/no-non-null-asserted-optional-chain
  394:56  error  Optional chain expressions can return undefined by design - using a non-null assertion is unsafe and wrong  @typescript-eslint/no-non-null-asserted-optional-chain
  395:58  error  Optional chain expressions can return undefined by design - using a non-null assertion is unsafe and wrong  @typescript-eslint/no-non-null-asserted-optional-chain
  400:61  error  Optional chain expressions can return undefined by design - using a non-null assertion is unsafe and wrong  @typescript-eslint/no-non-null-asserted-optional-chain
  401:55  error  Optional chain expressions can return undefined by design - using a non-null assertion is unsafe and wrong  @typescript-eslint/no-non-null-asserted-optional-chain
  402:57  error  Optional chain expressions can return undefined by design - using a non-null assertion is unsafe and wrong  @typescript-eslint/no-non-null-asserted-optional-chain

✖ 25 problems (25 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-server-providers/stdio-provider.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-server-providers\stdio-provider.ts
    1:48  error  'MCPServerUpdateEventData' is defined but never used  @typescript-eslint/no-unused-vars
    1:91  error  'SOCKET_EVENTS' is defined but never used             @typescript-eslint/no-unused-vars
    5:10  error  'spawn' is defined but never used                     @typescript-eslint/no-unused-vars
    5:17  error  'exec' is defined but never used                      @typescript-eslint/no-unused-vars
    5:23  error  'ChildProcess' is defined but never used              @typescript-eslint/no-unused-vars
    5:37  error  'ExecException' is defined but never used             @typescript-eslint/no-unused-vars
   17:46  error  Unexpected any. Specify a different type              @typescript-eslint/no-explicit-any
   18:3   error  'utilPromisify' is assigned a value but never used    @typescript-eslint/no-unused-vars
   18:41  error  Unexpected any. Specify a different type              @typescript-eslint/no-explicit-any
   35:88  error  Unexpected any. Specify a different type              @typescript-eslint/no-explicit-any
   97:25  error  Unexpected any. Specify a different type              @typescript-eslint/no-explicit-any
  198:74  error  Unexpected any. Specify a different type              @typescript-eslint/no-explicit-any
  198:88  error  Unexpected any. Specify a different type              @typescript-eslint/no-explicit-any
  216:11  error  'timeoutId' is never reassigned. Use 'const' instead  prefer-const
  235:20  error  'e' is defined but never used                         @typescript-eslint/no-unused-vars
  267:16  error  'err' is defined but never used                       @typescript-eslint/no-unused-vars
  267:21  error  Unexpected any. Specify a different type              @typescript-eslint/no-explicit-any

✖ 17 problems (17 errors, 0 warnings)


=== TYPE ERRORS FOR FILE: src/backend/mcp/mcp-server-providers/stdio-provider.ts ===
src/backend/mcp/mcp-server-providers/stdio-provider.ts(42,19): error TS2339: Property 'result' does not exist on type '{}'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(43,40): error TS2339: Property 'result' does not exist on type '{}'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(44,35): error TS2339: Property 'result' does not exist on type '{}'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(65,19): error TS2339: Property 'error' does not exist on type '{}'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(67,25): error TS2339: Property 'error' does not exist on type '{}'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(67,56): error TS2339: Property 'error' does not exist on type '{}'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(67,96): error TS2339: Property 'error' does not exist on type '{}'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(68,30): error TS2339: Property 'error' does not exist on type '{}'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(69,37): error TS2339: Property 'error' does not exist on type '{}'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(165,30): error TS2339: Property 'result' does not exist on type '{}'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(184,49): error TS2339: Property 'result' does not exist on type '{}'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(184,77): error TS2339: Property 'result' does not exist on type '{}'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(185,92): error TS2339: Property 'result' does not exist on type '{}'.


=== TYPE ERRORS FOR FILE: src/backend/mcp/mcp-server-providers/stdio-provider.ts ===
src/backend/mcp/mcp-server-providers/stdio-provider.ts(42,19): error TS2339: Property 'result' does not exist on type '{}'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(43,40): error TS2339: Property 'result' does not exist on type '{}'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(44,35): error TS2339: Property 'result' does not exist on type '{}'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(65,19): error TS2339: Property 'error' does not exist on type '{}'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(67,25): error TS2339: Property 'error' does not exist on type '{}'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(67,56): error TS2339: Property 'error' does not exist on type '{}'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(67,96): error TS2339: Property 'error' does not exist on type '{}'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(68,30): error TS2339: Property 'error' does not exist on type '{}'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(69,37): error TS2339: Property 'error' does not exist on type '{}'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(165,30): error TS2339: Property 'result' does not exist on type '{}'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(184,49): error TS2339: Property 'result' does not exist on type '{}'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(184,77): error TS2339: Property 'result' does not exist on type '{}'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(185,92): error TS2339: Property 'result' does not exist on type '{}'.


=== TYPE ERRORS FOR FILE: src/backend/mcp/mcp-server-providers/stdio-provider.ts ===
src/backend/mcp/mcp-server-providers/stdio-provider.ts(53,19): error TS2339: Property 'result' does not exist on type 'Error | JsonRpcResponse'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(54,40): error TS2339: Property 'result' does not exist on type 'Error | JsonRpcResponse'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(55,35): error TS2339: Property 'result' does not exist on type 'Error | JsonRpcResponse'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(76,19): error TS2339: Property 'error' does not exist on type 'Error | JsonRpcResponse'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(78,25): error TS2339: Property 'error' does not exist on type 'Error | JsonRpcResponse'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(78,56): error TS2339: Property 'error' does not exist on type 'Error | JsonRpcResponse'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(78,96): error TS2339: Property 'error' does not exist on type 'Error | JsonRpcResponse'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(79,30): error TS2339: Property 'error' does not exist on type 'Error | JsonRpcResponse'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(80,37): error TS2339: Property 'error' does not exist on type 'Error | JsonRpcResponse'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(176,30): error TS2339: Property 'result' does not exist on type 'Error | JsonRpcResponse'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(195,49): error TS2339: Property 'result' does not exist on type 'Error | JsonRpcResponse'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(195,77): error TS2339: Property 'result' does not exist on type 'Error | JsonRpcResponse'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(196,92): error TS2339: Property 'result' does not exist on type 'Error | JsonRpcResponse'.


=== TYPE ERRORS FOR FILE: src/backend/mcp/mcp-server-providers/stdio-provider.ts ===
src/backend/mcp/mcp-server-providers/stdio-provider.ts(53,19): error TS2339: Property 'result' does not exist on type 'Error | JsonRpcResponse'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(54,40): error TS2339: Property 'result' does not exist on type 'Error | JsonRpcResponse'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(55,35): error TS2339: Property 'result' does not exist on type 'Error | JsonRpcResponse'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(76,19): error TS2339: Property 'error' does not exist on type 'Error | JsonRpcResponse'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(78,25): error TS2339: Property 'error' does not exist on type 'Error | JsonRpcResponse'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(78,56): error TS2339: Property 'error' does not exist on type 'Error | JsonRpcResponse'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(78,96): error TS2339: Property 'error' does not exist on type 'Error | JsonRpcResponse'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(79,30): error TS2339: Property 'error' does not exist on type 'Error | JsonRpcResponse'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(80,37): error TS2339: Property 'error' does not exist on type 'Error | JsonRpcResponse'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(176,30): error TS2339: Property 'result' does not exist on type 'Error | JsonRpcResponse'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(195,49): error TS2339: Property 'result' does not exist on type 'Error | JsonRpcResponse'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(195,77): error TS2339: Property 'result' does not exist on type 'Error | JsonRpcResponse'.
src/backend/mcp/mcp-server-providers/stdio-provider.ts(196,92): error TS2339: Property 'result' does not exist on type 'Error | JsonRpcResponse'.


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-server-providers/streamable-http-provider.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-server-providers\streamable-http-provider.ts
    4:17   error  'AxiosInstance' is defined but never used  @typescript-eslint/no-unused-vars
    4:32   error  'AxiosResponse' is defined but never used  @typescript-eslint/no-unused-vars
   19:88   error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
   19:102  error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
   58:19   error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
   71:25   error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
  123:14   error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
  158:13   error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
  159:14   error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
  161:14   error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
  175:21   error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any

✖ 11 problems (11 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/todo-list/todo-list-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\todo-list\todo-list-mcp-server.ts
   95:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars
  137:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars
  146:59  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  181:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars
  221:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars
  230:59  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  258:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars
  287:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars
  315:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars
  338:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars
  366:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars

✖ 11 problems (11 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-server-loader.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-server-loader.ts
   22:66   error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  185:76   error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  193:21   error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  213:35   error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  213:106  error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  217:42   error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  219:11   error  Unexpected aliasing of 'this' to local variable  @typescript-eslint/no-this-alias
  222:72   error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  248:80   error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  283:36   error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any

✖ 10 problems (10 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-tool.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-tool.ts
  29:59  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  33:63  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  54:42  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  76:12  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  81:40  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  89:74  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  90:56  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 7 problems (7 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/apps/app-management-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\apps\app-management-mcp-server.ts
   43:446  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   61:38   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   79:51   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   97:450  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  116:38   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 5 problems (5 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/file/utils/mcp-file-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\file\utils\mcp-file-utils.ts
    1:10  error  'z' is defined but never used                       @typescript-eslint/no-unused-vars
   40:22  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
   97:22  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
  163:7   error  'operationName' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/file/update-file-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\file\update-file-mcp-server.ts
   2:8  error  'fs' is defined but never used                   @typescript-eslint/no-unused-vars
   3:8  error  'path' is defined but never used                 @typescript-eslint/no-unused-vars
  24:7  error  'getHeaders' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/ui-automation/ui-automation-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\ui-automation\ui-automation-mcp-server.ts
   81:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  102:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars
  102:23  error  'persona' is defined but never used       @typescript-eslint/no-unused-vars
  153:18  error  'error' is defined but never used         @typescript-eslint/no-unused-vars

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/utils/mcp-tool-adapter.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\utils\mcp-tool-adapter.ts
  15:57  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  23:20  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  35:37  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  50:25  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/documentation/documentor-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\documentation\documentor-mcp-server.ts
  12:15  error  'DiffPatch' is defined but never used  @typescript-eslint/no-unused-vars
  51:14  error  'err' is defined but never used        @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/command/run-terminal-command-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\command\run-terminal-command-mcp-server.ts
   2:10  error  'z' is defined but never used            @typescript-eslint/no-unused-vars
  34:22  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/directory/create-directory-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\directory\create-directory-mcp-server.ts
  2:10  error  'z' is defined but never used     @typescript-eslint/no-unused-vars
  4:8   error  'path' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/directory/remove-directory-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\directory\remove-directory-mcp-server.ts
   3:8   error  'path' is defined but never used          @typescript-eslint/no-unused-vars
  40:37  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/file/read-file-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\file\read-file-mcp-server.ts
  3:8  error  'path' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/file/remove-file-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\file\remove-file-mcp-server.ts
  26:11  error  'pathModule' is assigned a value but never used  @typescript-eslint/no-unused-vars
  34:16  error  'accessError' is defined but never used          @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/persona/utils/persona-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\persona\utils\persona-utils.ts
  2:10   error  'ChatPersona' is defined but never used   @typescript-eslint/no-unused-vars
  2:105  error  'TodoItemType' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/search/search-repository-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\search\search-repository-mcp-server.ts
  32:5  error  'normalizedPath' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/search/utils/SearchHelper.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\search\utils\SearchHelper.ts
    3:10  error  'isExcludedDir' is defined but never used  @typescript-eslint/no-unused-vars
  147:14  error  'error' is defined but never used          @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-server-providers/types.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-server-providers\types.ts
  7:84  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/awaiter/utils/awaiter-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\awaiter\utils\awaiter-utils.ts
  2:27  error  'SOCKET_EVENTS' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/followup/followup-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\followup\followup-mcp-server.ts
  49:20  error  'error' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/routes/utils/auth-routes-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\routes\utils\auth-routes-utils.ts
    1:25  error  'RawSocket' is defined but never used     @typescript-eslint/no-unused-vars
   18:3   error  'ToolsList' is defined but never used     @typescript-eslint/no-unused-vars
   38:8   error  'toolsService' is defined but never used  @typescript-eslint/no-unused-vars
  110:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  137:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  163:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  210:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  249:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  277:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  306:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  351:12  error  'error' is defined but never used         @typescript-eslint/no-unused-vars
  351:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  455:12  error  'error' is defined but never used         @typescript-eslint/no-unused-vars
  455:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  462:60  error  'data' is defined but never used          @typescript-eslint/no-unused-vars
  475:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  496:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  555:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 18 problems (18 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/routes/authRoutes.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\routes\authRoutes.ts
  10:25  error  'RawSocket' is defined but never used           @typescript-eslint/no-unused-vars
  11:16  error  'UserRole' is defined but never used            @typescript-eslint/no-unused-vars
  11:26  error  'AuthResponseData' is defined but never used    @typescript-eslint/no-unused-vars
  11:44  error  'UpdateUserData' is defined but never used      @typescript-eslint/no-unused-vars
  11:60  error  'GlobalPermissions' is defined but never used   @typescript-eslint/no-unused-vars
  11:79  error  'AppPermission' is defined but never used       @typescript-eslint/no-unused-vars
  13:10  error  'RoleManager' is defined but never used         @typescript-eslint/no-unused-vars
  14:10  error  'getRoleManager' is defined but never used      @typescript-eslint/no-unused-vars
  15:8   error  'userService' is defined but never used         @typescript-eslint/no-unused-vars
  15:23  error  'UserService' is defined but never used         @typescript-eslint/no-unused-vars
  23:3   error  'AuthStateEventData' is defined but never used  @typescript-eslint/no-unused-vars
  26:3   error  'ResponseData' is defined but never used        @typescript-eslint/no-unused-vars
  27:3   error  'FindUserData' is defined but never used        @typescript-eslint/no-unused-vars
  33:3   error  'FindByEmailData' is defined but never used     @typescript-eslint/no-unused-vars

✖ 14 problems (14 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/routes/platform-app-seed-data.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\routes\platform-app-seed-data.ts
  115:16  error  'postAppSeedAction' is defined but never used    @typescript-eslint/no-unused-vars
  149:10  error  'parseSeedActionBody' is defined but never used  @typescript-eslint/no-unused-vars
  173:16  error  'resolveAppServerUrl' is defined but never used  @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/mcp-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\mcp-utils.ts
   14:3    error  'addTodoItemSchemaFields' is defined but never used     @typescript-eslint/no-unused-vars
   31:26   error  'MAX_CONSECUTIVE_FAILURES' is defined but never used    @typescript-eslint/no-unused-vars
   72:96   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
   74:93   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
   75:57   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
   90:41   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  189:105  error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  447:15   error  'toolResultWrapped' is assigned a value but never used  @typescript-eslint/no-unused-vars
  586:23   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any

✖ 9 problems (9 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/template-resolvers/persona-resolver.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\template-resolvers\persona-resolver.ts
  12:3  error  '_isDeveloperMode' is defined but never used  @typescript-eslint/no-unused-vars
  13:3  error  '_providerData' is defined but never used     @typescript-eslint/no-unused-vars
  14:3  error  '_templateData' is defined but never used     @typescript-eslint/no-unused-vars
  31:3  error  '_sessionId' is defined but never used        @typescript-eslint/no-unused-vars
  32:3  error  '_persona' is defined but never used          @typescript-eslint/no-unused-vars
  33:3  error  '_isDeveloperMode' is defined but never used  @typescript-eslint/no-unused-vars
  34:3  error  '_providerData' is defined but never used     @typescript-eslint/no-unused-vars
  35:3  error  '_templateData' is defined but never used     @typescript-eslint/no-unused-vars

✖ 8 problems (8 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/type-script-validator.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\type-script-validator.ts
   1:10  error  'spawn' is defined but never used                   @typescript-eslint/no-unused-vars
  16:5   error  'utilPromisify' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/app-database-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\app-database-utils.ts
   43:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   59:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   71:78  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   76:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   93:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  165:27  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  184:41  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 7 problems (7 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/lint-file.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\lint-file.ts
   1:10  error  'spawn' is defined but never used                   @typescript-eslint/no-unused-vars
   1:17  error  'exec' is defined but never used                    @typescript-eslint/no-unused-vars
   1:23  error  'ChildProcess' is defined but never used            @typescript-eslint/no-unused-vars
   1:37  error  'ExecException' is defined but never used           @typescript-eslint/no-unused-vars
  15:48  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
  16:5   error  'utilPromisify' is assigned a value but never used  @typescript-eslint/no-unused-vars
  16:43  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any

✖ 7 problems (7 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/agent-response-parser.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\agent-response-parser.ts
  173:49  error  The `Function` type accepts any function-like value.
Prefer explicitly defining any function parameters and return type  @typescript-eslint/no-unsafe-function-type
  446:37  error  The `Function` type accepts any function-like value.
Prefer explicitly defining any function parameters and return type  @typescript-eslint/no-unsafe-function-type
  453:39  error  The `Function` type accepts any function-like value.
Prefer explicitly defining any function parameters and return type  @typescript-eslint/no-unsafe-function-type
  474:37  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
  490:44  error  The `Function` type accepts any function-like value.
Prefer explicitly defining any function parameters and return type  @typescript-eslint/no-unsafe-function-type

✖ 5 problems (5 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/logger.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\logger.ts
    3:20  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
    4:22  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
    5:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  146:31  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/file-helpers.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\file-helpers.ts
  11:25  error  'ICommand' is defined but never used                    @typescript-eslint/no-unused-vars
  16:3   error  'getRepoFileIndexGeneration' is defined but never used  @typescript-eslint/no-unused-vars
  17:3   error  'isRepoFileIndexFresh' is defined but never used        @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/failure-tracker.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\failure-tracker.ts
    1:10  error  'MCPToolResponse' is defined but never used        @typescript-eslint/no-unused-vars
  169:17  error  'compositeKey' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/mcp-production-enforcer.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\mcp-production-enforcer.ts
   8:3   error  'resolveTargetAppIdsFromToolParams' is defined but never used  @typescript-eslint/no-unused-vars
  40:38  error  Unexpected any. Specify a different type                       @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/parse-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\parse-utils.ts
  1:33  error  'MCPToolCall' is defined but never used    @typescript-eslint/no-unused-vars
  2:10  error  'AgentResponse' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/template-manager.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\template-manager.ts
  121:11  error  'nativeToolCalls' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/tool-call-execution-context.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\tool-call-execution-context.ts
  106:22  error  '_removed' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/auth/index.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\auth\index.ts
    7:10  error  'UserRegistrationData' is defined but never used                  @typescript-eslint/no-unused-vars
    7:32  error  'UserLoginData' is defined but never used                         @typescript-eslint/no-unused-vars
   32:18  error  An interface declaring no members is equivalent to its supertype  @typescript-eslint/no-empty-object-type
   93:29  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  105:10  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  129:16  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  144:16  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  209:89  error  'hash' is defined but never used                                  @typescript-eslint/no-unused-vars

✖ 8 problems (8 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/ai-providers.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\ai-providers.ts
   2:10  error  'ICommand' is defined but never used                              @typescript-eslint/no-unused-vars
   3:10  error  'IContextSettings' is defined but never used                      @typescript-eslint/no-unused-vars
   4:10  error  'ToolsList' is defined but never used                             @typescript-eslint/no-unused-vars
   5:10  error  'Persona' is defined but never used                               @typescript-eslint/no-unused-vars
  25:18  error  An interface declaring no members is equivalent to its supertype  @typescript-eslint/no-empty-object-type
  27:18  error  An interface declaring no members is equivalent to its supertype  @typescript-eslint/no-empty-object-type

✖ 6 problems (6 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/socket-events.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\socket-events.ts
   69:29  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  168:13  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  202:10  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  205:18  error  An interface declaring no members is equivalent to its supertype  @typescript-eslint/no-empty-object-type
  312:18  error  An interface declaring no members is equivalent to its supertype  @typescript-eslint/no-empty-object-type

✖ 5 problems (5 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/chat.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\chat.ts
    4:10  error  'FollowupEventData' is defined but never used  @typescript-eslint/no-unused-vars
   90:11  error  Unexpected any. Specify a different type       @typescript-eslint/no-explicit-any
  161:28  error  Unexpected any. Specify a different type       @typescript-eslint/no-explicit-any
  191:28  error  Unexpected any. Specify a different type       @typescript-eslint/no-explicit-any

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/lab-db.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\lab-db.ts
   2:29  error  'UIChatMessage' is defined but never used  @typescript-eslint/no-unused-vars
   2:44  error  'TodoList' is defined but never used       @typescript-eslint/no-unused-vars
  32:42  error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
  33:39  error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/app/app.d.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\app\app.d.ts
  157:15  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  176:15  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  177:14  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/forms-builder-integration.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\forms-builder-integration.ts
  47:10  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  61:26  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  62:51  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/mcp-tools.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\mcp-tools.ts
  29:23  error  Unexpected any. Specify a different type                                                                                                                                                                                                                                                                                                                                                   @typescript-eslint/no-explicit-any
  31:34  error  Unexpected any. Specify a different type                                                                                                                                                                                                                                                                                                                                                   @typescript-eslint/no-explicit-any
  35:19  error  The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
- If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
- If you want a type meaning "any object", you probably want `object` instead.
- If you want a type meaning "any value", you probably want `unknown` instead  @typescript-eslint/no-empty-object-type

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/llm-provider.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\llm-provider.ts
  74:43  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  87:37  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/mcp-servers.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\mcp-servers.ts
  24:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  41:11  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/app/App.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\app\App.ts
  1:10  error  'Component' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/todo-list.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\todo-list.ts
  1:10  error  'z' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/user.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\user.ts
  1:10  error  'AiProvider' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/app-management-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\app-management-format-result.ts
    2:3   error  'createAppSchemaFields' is defined but never used  @typescript-eslint/no-unused-vars
    3:3   error  'getAppSchemaFields' is defined but never used     @typescript-eslint/no-unused-vars
    4:3   error  'getAppsSchemaFields' is defined but never used    @typescript-eslint/no-unused-vars
    5:3   error  'updateAppSchemaFields' is defined but never used  @typescript-eslint/no-unused-vars
    6:3   error  'deleteAppSchemaFields' is defined but never used  @typescript-eslint/no-unused-vars
   69:34  error  Unexpected any. Specify a different type           @typescript-eslint/no-explicit-any
  166:15  error  'appId' is assigned a value but never used         @typescript-eslint/no-unused-vars
  183:70  error  Unexpected any. Specify a different type           @typescript-eslint/no-explicit-any

✖ 8 problems (8 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/base-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\base-utils.ts
    2:90   error  'MCPToolCall' is defined but never used         @typescript-eslint/no-unused-vars
    2:103  error  'MCPToolResponse' is defined but never used     @typescript-eslint/no-unused-vars
  161:129  error  'altPath' is defined but never used             @typescript-eslint/no-unused-vars
  216:9    error  'overwrite' is assigned a value but never used  @typescript-eslint/no-unused-vars
  237:27   error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any
  278:41   error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

✖ 6 problems (6 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/followup-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\followup-format-result.ts
   5:10  error  'z' is defined but never used                     @typescript-eslint/no-unused-vars
   7:10  error  'FollowupParamsSchema' is defined but never used  @typescript-eslint/no-unused-vars
   7:32  error  'Option' is defined but never used                @typescript-eslint/no-unused-vars
   7:40  error  'FollowupParams' is defined but never used        @typescript-eslint/no-unused-vars
  51:41  error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  51:46  error  'index' is defined but never used                 @typescript-eslint/no-unused-vars

✖ 6 problems (6 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/todo-list-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\todo-list-format-result.ts
   20:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   34:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  151:45  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  153:57  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/update-file-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\update-file-format-result.ts
   1:10  error  'z' is defined but never used           @typescript-eslint/no-unused-vars
  33:16  error  'parseError' is defined but never used  @typescript-eslint/no-unused-vars
  55:16  error  'parseError' is defined but never used  @typescript-eslint/no-unused-vars
  83:16  error  'parseError' is defined but never used  @typescript-eslint/no-unused-vars

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/persona-manager-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\persona-manager-format-result.ts
    1:10  error  'ZodSafeParseResult' is defined but never used  @typescript-eslint/no-unused-vars
   48:28  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any
  111:30  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/remove-file-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\remove-file-format-result.ts
  10:13  error  'path' is assigned a value but never used            @typescript-eslint/no-unused-vars
  10:25  error  'totalRemovals' is assigned a value but never used   @typescript-eslint/no-unused-vars
  10:40  error  'totalAdditions' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/search-repository-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\search-repository-format-result.ts
  13:13  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  16:12  error  'e' is defined but never used             @typescript-eslint/no-unused-vars
  39:27  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/web-query-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\web-query-format-result.ts
   6:13  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   9:12  error  'e' is defined but never used             @typescript-eslint/no-unused-vars
  36:35  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/useMcpToolFormatter.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\useMcpToolFormatter.ts
    2:74   error  'FileOperations' is defined but never used  @typescript-eslint/no-unused-vars
  201:124  error  'altPath' is defined but never used         @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/context7-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\context7-format-result.ts
   1:10  error  'ZodSafeParseResult' is defined but never used  @typescript-eslint/no-unused-vars
  47:30  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/create-file-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\create-file-format-result.ts
   6:9   error  'content' is assigned a value but never used  @typescript-eslint/no-unused-vars
  18:13  error  'path' is assigned a value but never used     @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/list-files-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\list-files-format-result.ts
  6:13  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  9:12  error  'e' is defined but never used             @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/awaiter-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\awaiter-format-result.ts
  8:9  error  'paramsResult' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/create-directory-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\create-directory-format-result.ts
  1:10  error  'ZodSafeParseResult' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/documentor-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\documentor-format-result.ts
  1:10  error  'ZodSafeParseResult' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/read-file-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\read-file-format-result.ts
  1:10  error  'ZodSafeParseResult' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-server-providers/streamable-http-provider.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-server-providers\streamable-http-provider.ts
    4:17   error  'AxiosInstance' is defined but never used  @typescript-eslint/no-unused-vars
    4:32   error  'AxiosResponse' is defined but never used  @typescript-eslint/no-unused-vars
   19:88   error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
   19:102  error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
   58:19   error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
   71:25   error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
  123:14   error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
  158:13   error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
  159:14   error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
  161:14   error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
  175:21   error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any

✖ 11 problems (11 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/todo-list/todo-list-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\todo-list\todo-list-mcp-server.ts
   95:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars
  137:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars
  146:59  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  181:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars
  221:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars
  230:59  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  258:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars
  287:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars
  315:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars
  338:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars
  366:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars

✖ 11 problems (11 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-server-loader.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-server-loader.ts
   22:66   error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  185:76   error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  193:21   error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  213:35   error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  213:106  error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  217:42   error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  219:11   error  Unexpected aliasing of 'this' to local variable  @typescript-eslint/no-this-alias
  222:72   error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  248:80   error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  283:36   error  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any

✖ 10 problems (10 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-tool.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-tool.ts
  29:59  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  33:63  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  54:42  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  76:12  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  81:40  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  89:74  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  90:56  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 7 problems (7 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/apps/app-management-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\apps\app-management-mcp-server.ts
   43:446  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   61:38   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   79:51   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   97:450  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  116:38   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 5 problems (5 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/file/utils/mcp-file-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\file\utils\mcp-file-utils.ts
    1:10  error  'z' is defined but never used                       @typescript-eslint/no-unused-vars
   40:22  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
   97:22  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
  163:7   error  'operationName' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/file/update-file-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\file\update-file-mcp-server.ts
   2:8  error  'fs' is defined but never used                   @typescript-eslint/no-unused-vars
   3:8  error  'path' is defined but never used                 @typescript-eslint/no-unused-vars
  24:7  error  'getHeaders' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/ui-automation/ui-automation-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\ui-automation\ui-automation-mcp-server.ts
   81:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  102:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars
  102:23  error  'persona' is defined but never used       @typescript-eslint/no-unused-vars
  153:18  error  'error' is defined but never used         @typescript-eslint/no-unused-vars

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/utils/mcp-tool-adapter.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\utils\mcp-tool-adapter.ts
  15:57  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  23:20  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  35:37  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  50:25  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/documentation/documentor-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\documentation\documentor-mcp-server.ts
  12:15  error  'DiffPatch' is defined but never used  @typescript-eslint/no-unused-vars
  51:14  error  'err' is defined but never used        @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/command/run-terminal-command-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\command\run-terminal-command-mcp-server.ts
   2:10  error  'z' is defined but never used            @typescript-eslint/no-unused-vars
  34:22  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/directory/create-directory-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\directory\create-directory-mcp-server.ts
  2:10  error  'z' is defined but never used     @typescript-eslint/no-unused-vars
  4:8   error  'path' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/directory/remove-directory-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\directory\remove-directory-mcp-server.ts
   3:8   error  'path' is defined but never used          @typescript-eslint/no-unused-vars
  40:37  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/file/read-file-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\file\read-file-mcp-server.ts
  3:8  error  'path' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/file/remove-file-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\file\remove-file-mcp-server.ts
  26:11  error  'pathModule' is assigned a value but never used  @typescript-eslint/no-unused-vars
  34:16  error  'accessError' is defined but never used          @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/persona/utils/persona-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\persona\utils\persona-utils.ts
  2:10   error  'ChatPersona' is defined but never used   @typescript-eslint/no-unused-vars
  2:105  error  'TodoItemType' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/search/search-repository-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\search\search-repository-mcp-server.ts
  32:5  error  'normalizedPath' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/search/utils/SearchHelper.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\search\utils\SearchHelper.ts
    3:10  error  'isExcludedDir' is defined but never used  @typescript-eslint/no-unused-vars
  147:14  error  'error' is defined but never used          @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-server-providers/types.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-server-providers\types.ts
  7:84  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/awaiter/utils/awaiter-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\awaiter\utils\awaiter-utils.ts
  2:27  error  'SOCKET_EVENTS' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/followup/followup-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\followup\followup-mcp-server.ts
  49:20  error  'error' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/routes/utils/auth-routes-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\routes\utils\auth-routes-utils.ts
    1:25  error  'RawSocket' is defined but never used     @typescript-eslint/no-unused-vars
   18:3   error  'ToolsList' is defined but never used     @typescript-eslint/no-unused-vars
   38:8   error  'toolsService' is defined but never used  @typescript-eslint/no-unused-vars
  110:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  137:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  163:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  210:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  249:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  277:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  306:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  351:12  error  'error' is defined but never used         @typescript-eslint/no-unused-vars
  351:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  455:12  error  'error' is defined but never used         @typescript-eslint/no-unused-vars
  455:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  462:60  error  'data' is defined but never used          @typescript-eslint/no-unused-vars
  475:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  496:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  555:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 18 problems (18 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/routes/authRoutes.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\routes\authRoutes.ts
  10:25  error  'RawSocket' is defined but never used           @typescript-eslint/no-unused-vars
  11:16  error  'UserRole' is defined but never used            @typescript-eslint/no-unused-vars
  11:26  error  'AuthResponseData' is defined but never used    @typescript-eslint/no-unused-vars
  11:44  error  'UpdateUserData' is defined but never used      @typescript-eslint/no-unused-vars
  11:60  error  'GlobalPermissions' is defined but never used   @typescript-eslint/no-unused-vars
  11:79  error  'AppPermission' is defined but never used       @typescript-eslint/no-unused-vars
  13:10  error  'RoleManager' is defined but never used         @typescript-eslint/no-unused-vars
  14:10  error  'getRoleManager' is defined but never used      @typescript-eslint/no-unused-vars
  15:8   error  'userService' is defined but never used         @typescript-eslint/no-unused-vars
  15:23  error  'UserService' is defined but never used         @typescript-eslint/no-unused-vars
  23:3   error  'AuthStateEventData' is defined but never used  @typescript-eslint/no-unused-vars
  26:3   error  'ResponseData' is defined but never used        @typescript-eslint/no-unused-vars
  27:3   error  'FindUserData' is defined but never used        @typescript-eslint/no-unused-vars
  33:3   error  'FindByEmailData' is defined but never used     @typescript-eslint/no-unused-vars

✖ 14 problems (14 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/routes/platform-app-seed-data.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\routes\platform-app-seed-data.ts
  115:16  error  'postAppSeedAction' is defined but never used    @typescript-eslint/no-unused-vars
  149:10  error  'parseSeedActionBody' is defined but never used  @typescript-eslint/no-unused-vars
  173:16  error  'resolveAppServerUrl' is defined but never used  @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/mcp-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\mcp-utils.ts
   14:3    error  'addTodoItemSchemaFields' is defined but never used     @typescript-eslint/no-unused-vars
   31:26   error  'MAX_CONSECUTIVE_FAILURES' is defined but never used    @typescript-eslint/no-unused-vars
   72:96   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
   74:93   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
   75:57   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
   90:41   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  189:105  error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  447:15   error  'toolResultWrapped' is assigned a value but never used  @typescript-eslint/no-unused-vars
  586:23   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any

✖ 9 problems (9 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/template-resolvers/persona-resolver.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\template-resolvers\persona-resolver.ts
  12:3  error  '_isDeveloperMode' is defined but never used  @typescript-eslint/no-unused-vars
  13:3  error  '_providerData' is defined but never used     @typescript-eslint/no-unused-vars
  14:3  error  '_templateData' is defined but never used     @typescript-eslint/no-unused-vars
  31:3  error  '_sessionId' is defined but never used        @typescript-eslint/no-unused-vars
  32:3  error  '_persona' is defined but never used          @typescript-eslint/no-unused-vars
  33:3  error  '_isDeveloperMode' is defined but never used  @typescript-eslint/no-unused-vars
  34:3  error  '_providerData' is defined but never used     @typescript-eslint/no-unused-vars
  35:3  error  '_templateData' is defined but never used     @typescript-eslint/no-unused-vars

✖ 8 problems (8 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/type-script-validator.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\type-script-validator.ts
   1:10  error  'spawn' is defined but never used                   @typescript-eslint/no-unused-vars
  16:5   error  'utilPromisify' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/app-database-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\app-database-utils.ts
   43:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   59:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   71:78  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   76:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   93:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  165:27  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  184:41  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 7 problems (7 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/lint-file.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\lint-file.ts
   1:10  error  'spawn' is defined but never used                   @typescript-eslint/no-unused-vars
   1:17  error  'exec' is defined but never used                    @typescript-eslint/no-unused-vars
   1:23  error  'ChildProcess' is defined but never used            @typescript-eslint/no-unused-vars
   1:37  error  'ExecException' is defined but never used           @typescript-eslint/no-unused-vars
  15:48  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
  16:5   error  'utilPromisify' is assigned a value but never used  @typescript-eslint/no-unused-vars
  16:43  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any

✖ 7 problems (7 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/agent-response-parser.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\agent-response-parser.ts
  173:49  error  The `Function` type accepts any function-like value.
Prefer explicitly defining any function parameters and return type  @typescript-eslint/no-unsafe-function-type
  446:37  error  The `Function` type accepts any function-like value.
Prefer explicitly defining any function parameters and return type  @typescript-eslint/no-unsafe-function-type
  453:39  error  The `Function` type accepts any function-like value.
Prefer explicitly defining any function parameters and return type  @typescript-eslint/no-unsafe-function-type
  474:37  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
  490:44  error  The `Function` type accepts any function-like value.
Prefer explicitly defining any function parameters and return type  @typescript-eslint/no-unsafe-function-type

✖ 5 problems (5 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/logger.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\logger.ts
    3:20  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
    4:22  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
    5:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  146:31  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/file-helpers.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\file-helpers.ts
  11:25  error  'ICommand' is defined but never used                    @typescript-eslint/no-unused-vars
  16:3   error  'getRepoFileIndexGeneration' is defined but never used  @typescript-eslint/no-unused-vars
  17:3   error  'isRepoFileIndexFresh' is defined but never used        @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/failure-tracker.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\failure-tracker.ts
    1:10  error  'MCPToolResponse' is defined but never used        @typescript-eslint/no-unused-vars
  169:17  error  'compositeKey' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/mcp-production-enforcer.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\mcp-production-enforcer.ts
   8:3   error  'resolveTargetAppIdsFromToolParams' is defined but never used  @typescript-eslint/no-unused-vars
  40:38  error  Unexpected any. Specify a different type                       @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/parse-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\parse-utils.ts
  1:33  error  'MCPToolCall' is defined but never used    @typescript-eslint/no-unused-vars
  2:10  error  'AgentResponse' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/template-manager.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\template-manager.ts
  121:11  error  'nativeToolCalls' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/tool-call-execution-context.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\tool-call-execution-context.ts
  106:22  error  '_removed' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/auth/index.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\auth\index.ts
    7:10  error  'UserRegistrationData' is defined but never used                  @typescript-eslint/no-unused-vars
    7:32  error  'UserLoginData' is defined but never used                         @typescript-eslint/no-unused-vars
   32:18  error  An interface declaring no members is equivalent to its supertype  @typescript-eslint/no-empty-object-type
   93:29  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  105:10  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  129:16  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  144:16  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  209:89  error  'hash' is defined but never used                                  @typescript-eslint/no-unused-vars

✖ 8 problems (8 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/ai-providers.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\ai-providers.ts
   2:10  error  'ICommand' is defined but never used                              @typescript-eslint/no-unused-vars
   3:10  error  'IContextSettings' is defined but never used                      @typescript-eslint/no-unused-vars
   4:10  error  'ToolsList' is defined but never used                             @typescript-eslint/no-unused-vars
   5:10  error  'Persona' is defined but never used                               @typescript-eslint/no-unused-vars
  25:18  error  An interface declaring no members is equivalent to its supertype  @typescript-eslint/no-empty-object-type
  27:18  error  An interface declaring no members is equivalent to its supertype  @typescript-eslint/no-empty-object-type

✖ 6 problems (6 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/socket-events.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\socket-events.ts
   69:29  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  168:13  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  202:10  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  205:18  error  An interface declaring no members is equivalent to its supertype  @typescript-eslint/no-empty-object-type
  312:18  error  An interface declaring no members is equivalent to its supertype  @typescript-eslint/no-empty-object-type

✖ 5 problems (5 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/chat.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\chat.ts
    4:10  error  'FollowupEventData' is defined but never used  @typescript-eslint/no-unused-vars
   90:11  error  Unexpected any. Specify a different type       @typescript-eslint/no-explicit-any
  161:28  error  Unexpected any. Specify a different type       @typescript-eslint/no-explicit-any
  191:28  error  Unexpected any. Specify a different type       @typescript-eslint/no-explicit-any

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/lab-db.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\lab-db.ts
   2:29  error  'UIChatMessage' is defined but never used  @typescript-eslint/no-unused-vars
   2:44  error  'TodoList' is defined but never used       @typescript-eslint/no-unused-vars
  32:42  error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
  33:39  error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/app/app.d.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\app\app.d.ts
  157:15  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  176:15  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  177:14  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/forms-builder-integration.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\forms-builder-integration.ts
  47:10  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  61:26  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  62:51  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/mcp-tools.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\mcp-tools.ts
  29:23  error  Unexpected any. Specify a different type                                                                                                                                                                                                                                                                                                                                                   @typescript-eslint/no-explicit-any
  31:34  error  Unexpected any. Specify a different type                                                                                                                                                                                                                                                                                                                                                   @typescript-eslint/no-explicit-any
  35:19  error  The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
- If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
- If you want a type meaning "any object", you probably want `object` instead.
- If you want a type meaning "any value", you probably want `unknown` instead  @typescript-eslint/no-empty-object-type

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/llm-provider.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\llm-provider.ts
  74:43  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  87:37  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/mcp-servers.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\mcp-servers.ts
  24:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  41:11  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/app/App.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\app\App.ts
  1:10  error  'Component' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/todo-list.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\todo-list.ts
  1:10  error  'z' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/user.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\user.ts
  1:10  error  'AiProvider' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/app-management-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\app-management-format-result.ts
    2:3   error  'createAppSchemaFields' is defined but never used  @typescript-eslint/no-unused-vars
    3:3   error  'getAppSchemaFields' is defined but never used     @typescript-eslint/no-unused-vars
    4:3   error  'getAppsSchemaFields' is defined but never used    @typescript-eslint/no-unused-vars
    5:3   error  'updateAppSchemaFields' is defined but never used  @typescript-eslint/no-unused-vars
    6:3   error  'deleteAppSchemaFields' is defined but never used  @typescript-eslint/no-unused-vars
   69:34  error  Unexpected any. Specify a different type           @typescript-eslint/no-explicit-any
  166:15  error  'appId' is assigned a value but never used         @typescript-eslint/no-unused-vars
  183:70  error  Unexpected any. Specify a different type           @typescript-eslint/no-explicit-any

✖ 8 problems (8 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/base-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\base-utils.ts
    2:90   error  'MCPToolCall' is defined but never used         @typescript-eslint/no-unused-vars
    2:103  error  'MCPToolResponse' is defined but never used     @typescript-eslint/no-unused-vars
  161:129  error  'altPath' is defined but never used             @typescript-eslint/no-unused-vars
  216:9    error  'overwrite' is assigned a value but never used  @typescript-eslint/no-unused-vars
  237:27   error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any
  278:41   error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

✖ 6 problems (6 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/followup-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\followup-format-result.ts
   5:10  error  'z' is defined but never used                     @typescript-eslint/no-unused-vars
   7:10  error  'FollowupParamsSchema' is defined but never used  @typescript-eslint/no-unused-vars
   7:32  error  'Option' is defined but never used                @typescript-eslint/no-unused-vars
   7:40  error  'FollowupParams' is defined but never used        @typescript-eslint/no-unused-vars
  51:41  error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  51:46  error  'index' is defined but never used                 @typescript-eslint/no-unused-vars

✖ 6 problems (6 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/todo-list-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\todo-list-format-result.ts
   20:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   34:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  151:45  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  153:57  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/update-file-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\update-file-format-result.ts
   1:10  error  'z' is defined but never used           @typescript-eslint/no-unused-vars
  33:16  error  'parseError' is defined but never used  @typescript-eslint/no-unused-vars
  55:16  error  'parseError' is defined but never used  @typescript-eslint/no-unused-vars
  83:16  error  'parseError' is defined but never used  @typescript-eslint/no-unused-vars

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/persona-manager-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\persona-manager-format-result.ts
    1:10  error  'ZodSafeParseResult' is defined but never used  @typescript-eslint/no-unused-vars
   48:28  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any
  111:30  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/remove-file-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\remove-file-format-result.ts
  10:13  error  'path' is assigned a value but never used            @typescript-eslint/no-unused-vars
  10:25  error  'totalRemovals' is assigned a value but never used   @typescript-eslint/no-unused-vars
  10:40  error  'totalAdditions' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/search-repository-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\search-repository-format-result.ts
  13:13  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  16:12  error  'e' is defined but never used             @typescript-eslint/no-unused-vars
  39:27  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/web-query-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\web-query-format-result.ts
   6:13  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   9:12  error  'e' is defined but never used             @typescript-eslint/no-unused-vars
  36:35  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/useMcpToolFormatter.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\useMcpToolFormatter.ts
    2:74   error  'FileOperations' is defined but never used  @typescript-eslint/no-unused-vars
  201:124  error  'altPath' is defined but never used         @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/context7-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\context7-format-result.ts
   1:10  error  'ZodSafeParseResult' is defined but never used  @typescript-eslint/no-unused-vars
  47:30  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/create-file-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\create-file-format-result.ts
   6:9   error  'content' is assigned a value but never used  @typescript-eslint/no-unused-vars
  18:13  error  'path' is assigned a value but never used     @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/list-files-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\list-files-format-result.ts
  6:13  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  9:12  error  'e' is defined but never used             @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/awaiter-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\awaiter-format-result.ts
  8:9  error  'paramsResult' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/create-directory-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\create-directory-format-result.ts
  1:10  error  'ZodSafeParseResult' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/documentor-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\documentor-format-result.ts
  1:10  error  'ZodSafeParseResult' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/read-file-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\read-file-format-result.ts
  1:10  error  'ZodSafeParseResult' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/components/useUserManagement.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useUserManagement.ts
    2:89  error  'UserStatus' is defined but never used                                 @typescript-eslint/no-unused-vars
  100:24  error  'user' is defined but never used                                       @typescript-eslint/no-unused-vars
  148:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  149:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  150:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  151:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  161:9   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  162:9   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  163:9   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  196:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  197:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  204:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  205:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  267:14  error  'err' is defined but never used                                        @typescript-eslint/no-unused-vars
  267:19  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any

✖ 15 problems (15 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/components/useMessageInput.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useMessageInput.ts
    8:10  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   31:28  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   42:42  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   42:79  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   58:44  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   69:43  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
  183:32  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
  183:46  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
  267:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  287:9   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  404:36  error  'index' is defined but never used                                      @typescript-eslint/no-unused-vars
  440:45  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any

✖ 12 problems (12 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/components/useMessagesView.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useMessagesView.ts
   1:15   error  'Ref' is defined but never used              @typescript-eslint/no-unused-vars
   1:30   error  'defineEmits' is defined but never used      @typescript-eslint/no-unused-vars
   1:43   error  'watch' is defined but never used            @typescript-eslint/no-unused-vars
   2:44   error  'MCPToolCall' is defined but never used      @typescript-eslint/no-unused-vars
   2:57   error  'MCPToolResponse' is defined but never used  @typescript-eslint/no-unused-vars
   2:104  error  'ChatMessage' is defined but never used      @typescript-eslint/no-unused-vars
   2:141  error  'ChatPersona' is defined but never used      @typescript-eslint/no-unused-vars
  88:36   error  Unexpected any. Specify a different type     @typescript-eslint/no-explicit-any
  90:43   error  Unexpected any. Specify a different type     @typescript-eslint/no-explicit-any
  97:28   error  Unexpected any. Specify a different type     @typescript-eslint/no-explicit-any

✖ 10 problems (10 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/utils/useInputFileHandler.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useInputFileHandler.ts
    2:10  error  'useToast' is defined but never used                                                                                     @typescript-eslint/no-unused-vars
   33:33  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
   48:33  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
   50:33  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
   83:53  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
   84:31  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
  133:32  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
  147:64  error  The `Function` type accepts any function-like value.
Prefer explicitly defining any function parameters and return type  @typescript-eslint/no-unsafe-function-type
  203:53  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
  204:31  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
  217:29  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any

✖ 11 problems (11 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/components/useFileOverview.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useFileOverview.ts
   32:22  error  'value' is assigned a value but never used      @typescript-eslint/no-unused-vars
   75:31  error  'diffs' is assigned a value but never used      @typescript-eslint/no-unused-vars
   76:69  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any
  169:40  error  'content' is assigned a value but never used    @typescript-eslint/no-unused-vars
  169:49  error  'overwrite' is assigned a value but never used  @typescript-eslint/no-unused-vars
  172:71  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any
  208:40  error  'diffs' is assigned a value but never used      @typescript-eslint/no-unused-vars
  211:71  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

✖ 8 problems (8 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/utils/useMessageHandlers.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useMessageHandlers.ts
   1:10   error  'ref' is defined but never used                  @typescript-eslint/no-unused-vars
   4:251  error  'SocketErrorEvent' is defined but never used     @typescript-eslint/no-unused-vars
   4:291  error  'ChatInitializedData' is defined but never used  @typescript-eslint/no-unused-vars
  25:9    error  'toast' is assigned a value but never used       @typescript-eslint/no-unused-vars
  93:32   error  'err' is defined but never used                  @typescript-eslint/no-unused-vars

✖ 5 problems (5 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/components/usePersonaManagement.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\usePersonaManagement.ts
  2:67  error  'ICommand' is defined but never used     @typescript-eslint/no-unused-vars
  2:77  error  'ToolsList' is defined but never used    @typescript-eslint/no-unused-vars
  2:88  error  'ChatPersona' is defined but never used  @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/utils/useSessionHandlers.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useSessionHandlers.ts
   1:10   error  'ref' is defined but never used                         @typescript-eslint/no-unused-vars
   4:133  error  'NewSessionCreatedEventData' is defined but never used  @typescript-eslint/no-unused-vars
  10:43   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  11:32   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  13:45   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any

✖ 5 problems (5 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/components/useMCPServerManagement.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useMCPServerManagement.ts
    1:25  error  'watch' is defined but never used     @typescript-eslint/no-unused-vars
  165:33  error  'serverId' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/utils/useAuthHandlers.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useAuthHandlers.ts
  4:26  error  'getAuthUser' is defined but never used          @typescript-eslint/no-unused-vars
  4:68  error  'isUserAuthenticated' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/utils/useProviderHandlers.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useProviderHandlers.ts
   1:10  error  'ref' is defined but never used   @typescript-eslint/no-unused-vars
  46:41  error  'data' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/components/app-view-layout-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\app-view-layout-utils.ts
  9:3  error  'ANCHORED_HOST_SPLIT_RATIO' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/components/useApiManagement.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useApiManagement.ts
  1:10  error  'Ref' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/components/useCommandManagement.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useCommandManagement.ts
  2:29  error  'ChatPersona' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/components/useContextManagement.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useContextManagement.ts
  1:38  error  'watch' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/components/useSystemMessageManagement.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useSystemMessageManagement.ts
  2:25  error  'onMounted' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/components/useTodoList.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useTodoList.ts
  50:25  error  'toolresult' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/utils/mcp-tool-json-schema.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\utils\mcp-tool-json-schema.ts
   52:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   52:54  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   52:59  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   56:41  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   60:64  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   94:38  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  104:36  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  139:39  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  139:45  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  172:29  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  176:29  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 11 problems (11 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/utils/mention-blot.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\utils\mention-blot.ts
   2:15  error  'InlineBlot' is defined but never used    @typescript-eslint/no-unused-vars
   9:46  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  22:12  error  'context' is defined but never used       @typescript-eslint/no-unused-vars
  22:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  27:22  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  27:32  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 6 problems (6 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/eslint-rules/vue-unique-id-rule.js ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\eslint-rules\vue-unique-id-rule.js
  67:10  error  'hasUniqueIdPattern' is defined but never used     @typescript-eslint/no-unused-vars
  71:10  error  'hasUseUniqueIdPattern' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/templates/db/schemas/migration.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\templates\db\schemas\migration.ts
   1:26  error  'Database' is defined but never used  @typescript-eslint/no-unused-vars
  71:14  error  'error' is defined but never used     @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/utils/public-user.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\utils\public-user.ts
  4:25  error  '_omit' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/services/AppUpdateManager.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\services\AppUpdateManager.ts
   74:59  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
   74:87  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
   81:53  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
  117:39  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
  144:39  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
  175:19  error  'formattedPath' is assigned a value but never used  @typescript-eslint/no-unused-vars
  278:39  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any

✖ 7 problems (7 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/services/AppRegistry.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\services\AppRegistry.ts
   19:16  error  'IServerConfig' is defined but never used         @typescript-eslint/no-unused-vars
   19:44  error  'AppConfigWithAppType' is defined but never used  @typescript-eslint/no-unused-vars
   19:78  error  'AppType' is defined but never used               @typescript-eslint/no-unused-vars
   27:68  error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  421:30  error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  422:34  error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any

✖ 6 problems (6 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/services/ServerAppRegistry.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\services\ServerAppRegistry.ts
   12:64  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   35:65  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   52:63  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   69:68  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  118:61  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  130:47  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 6 problems (6 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/services/TemplateGenerator.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\services\TemplateGenerator.ts
   92:21   error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
  161:109  error  'port' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/services/ui-automation-handler.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\services\ui-automation-handler.ts
  412:20  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/services/RoleManager.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\services\RoleManager.ts
  10:43  error  'AppPermission' is defined but never used      @typescript-eslint/no-unused-vars
  10:58  error  'GlobalPermissions' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/theme/lab-theme-draft-store.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\theme\lab-theme-draft-store.ts
   3:10  error  'applyLabTheme' is defined but never used               @typescript-eslint/no-unused-vars
  22:3   error  'getBuiltinPresetDefinition' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/charts/chart-options.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\charts\chart-options.ts
  1:15  error  'ChartOptionsConfig' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/charts/ChartRuntime.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\charts\ChartRuntime.vue
  85:3  error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/theme/lab-theme-preset-id.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\theme\lab-theme-preset-id.ts
  1:37  error  'LabThemeMode' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/theme/tailwind-color-resolve.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\theme\tailwind-color-resolve.ts
  179:3  error  '_expectedPrefix' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/components/chat/MessageInput.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\chat\MessageInput.vue
    2:15  error  'computed' is defined but never used                @typescript-eslint/no-unused-vars
   55:98  error  'clearAllFiles' is assigned a value but never used  @typescript-eslint/no-unused-vars
   65:52  error  'oldSession' is defined but never used              @typescript-eslint/no-unused-vars
   97:41  error  Unexpected mutation of "activeSessionRef" prop      vue/no-mutating-props
  260:30  error  'idx' is defined but never used                     vue/no-unused-vars
  276:59  error  'aHidx' is defined but never used                   vue/no-unused-vars

✖ 6 problems (6 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/components/chat/MessagesView.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\chat\MessagesView.vue
    2:10   error  'ref' is defined but never used                      @typescript-eslint/no-unused-vars
    2:32   error  'ComponentPublicInstance' is defined but never used  @typescript-eslint/no-unused-vars
    3:124  error  'FollowupEventData' is defined but never used        @typescript-eslint/no-unused-vars
    9:8    error  'Button' is defined but never used                   @typescript-eslint/no-unused-vars
  187:35   error  'index' is defined but never used                    vue/no-unused-vars

✖ 5 problems (5 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/components/chat/LabAssistant.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\chat\LabAssistant.vue
  7:109  error  'User' is defined but never used               @typescript-eslint/no-unused-vars
  7:115  error  'UserRole' is defined but never used           @typescript-eslint/no-unused-vars
  7:149  error  'FollowupEventData' is defined but never used  @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/components/chat/FollowupOptions.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\chat\FollowupOptions.vue
  3:28  error  'FollowupEventData' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/components/app/VersionBadge.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\app\VersionBadge.vue
  8:10  error  'ref' is defined but never used        @typescript-eslint/no-unused-vars
  8:25  error  'watch' is defined but never used      @typescript-eslint/no-unused-vars
  8:32  error  'onMounted' is defined but never used  @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/components/file-overview/FileOverview.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\file-overview\FileOverview.vue
   5:23  error  'FileOperations' is defined but never used  @typescript-eslint/no-unused-vars
  71:40  error  'fIdx' is defined but never used            vue/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/components/auth/ForcePasswordChangeDialog.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\auth\ForcePasswordChangeDialog.vue
  11:7  error  'props' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/components/auth/LabLoginDialog.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\auth\LabLoginDialog.vue
  10:7  error  'props' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/components/messages/LabMessagesTwInviteCard.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\messages\LabMessagesTwInviteCard.vue
  6:7  error  'props' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/components/todo-list/TodoList.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\todo-list\TodoList.vue
  54:40  error  'index' is defined but never used  vue/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/components/settings/MCPServerManagement.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\settings\MCPServerManagement.vue
   5:8  error  'Listbox' is defined but never used                    @typescript-eslint/no-unused-vars
  56:3  error  'renameMcpServer' is assigned a value but never used   @typescript-eslint/no-unused-vars
  57:3  error  'showRenameOption' is assigned a value but never used  @typescript-eslint/no-unused-vars
  58:3  error  'testConnection' is assigned a value but never used    @typescript-eslint/no-unused-vars

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/components/settings/CommandManagement.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\settings\CommandManagement.vue
  2:10  error  'computed' is defined but never used     @typescript-eslint/no-unused-vars
  2:20  error  'ref' is defined but never used          @typescript-eslint/no-unused-vars
  7:29  error  'ChatPersona' is defined but never used  @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/components/settings/ContextManagement.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\settings\ContextManagement.vue
  2:10  error  'computed' is defined but never used  @typescript-eslint/no-unused-vars
  2:20  error  'ref' is defined but never used       @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/components/settings/PersonaManagement.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\settings\PersonaManagement.vue
  20:3  error  'settingsTablistTier2PtClass' is defined but never used  @typescript-eslint/no-unused-vars
  33:3  error  'personaSelected' is assigned a value but never used     @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/components/settings/SessionManagement.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\settings\SessionManagement.vue
  20:26  error  'personaName' is defined but never used  @typescript-eslint/no-unused-vars
  21:25  error  'personaName' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/components/settings/SystemMessageManagement.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\settings\SystemMessageManagement.vue
   2:10  error  'computed' is defined but never used       @typescript-eslint/no-unused-vars
  18:7   error  'emit' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/components/settings/UserManagement.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\settings\UserManagement.vue
   30:7   error  'emit' is assigned a value but never used  @typescript-eslint/no-unused-vars
  323:33  error  'idx' is defined but never used            vue/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/components/settings/ThemeManagement.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\settings\ThemeManagement.vue
  91:7  error  'accordionRootId' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/apps/app-management-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\apps\app-management-mcp-server.ts
   43:446  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   61:38   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   79:51   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   97:450  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  116:38   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 5 problems (5 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/file/utils/mcp-file-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\file\utils\mcp-file-utils.ts
    1:10  error  'z' is defined but never used                       @typescript-eslint/no-unused-vars
   40:22  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
   97:22  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
  163:7   error  'operationName' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/file/update-file-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\file\update-file-mcp-server.ts
   2:8  error  'fs' is defined but never used                   @typescript-eslint/no-unused-vars
   3:8  error  'path' is defined but never used                 @typescript-eslint/no-unused-vars
  24:7  error  'getHeaders' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/ui-automation/ui-automation-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\ui-automation\ui-automation-mcp-server.ts
   81:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  102:12  error  'sessionId' is defined but never used     @typescript-eslint/no-unused-vars
  102:23  error  'persona' is defined but never used       @typescript-eslint/no-unused-vars
  153:18  error  'error' is defined but never used         @typescript-eslint/no-unused-vars

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/utils/mcp-tool-adapter.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\utils\mcp-tool-adapter.ts
  15:57  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  23:20  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  35:37  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  50:25  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/documentation/documentor-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\documentation\documentor-mcp-server.ts
  12:15  error  'DiffPatch' is defined but never used  @typescript-eslint/no-unused-vars
  51:14  error  'err' is defined but never used        @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/command/run-terminal-command-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\command\run-terminal-command-mcp-server.ts
   2:10  error  'z' is defined but never used            @typescript-eslint/no-unused-vars
  34:22  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/directory/create-directory-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\directory\create-directory-mcp-server.ts
  2:10  error  'z' is defined but never used     @typescript-eslint/no-unused-vars
  4:8   error  'path' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/directory/remove-directory-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\directory\remove-directory-mcp-server.ts
   3:8   error  'path' is defined but never used          @typescript-eslint/no-unused-vars
  40:37  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/file/read-file-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\file\read-file-mcp-server.ts
  3:8  error  'path' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/file/remove-file-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\file\remove-file-mcp-server.ts
  26:11  error  'pathModule' is assigned a value but never used  @typescript-eslint/no-unused-vars
  34:16  error  'accessError' is defined but never used          @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/persona/utils/persona-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\persona\utils\persona-utils.ts
  2:10   error  'ChatPersona' is defined but never used   @typescript-eslint/no-unused-vars
  2:105  error  'TodoItemType' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/search/search-repository-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\search\search-repository-mcp-server.ts
  32:5  error  'normalizedPath' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/search/utils/SearchHelper.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\search\utils\SearchHelper.ts
    3:10  error  'isExcludedDir' is defined but never used  @typescript-eslint/no-unused-vars
  147:14  error  'error' is defined but never used          @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-server-providers/types.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-server-providers\types.ts
  7:84  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/awaiter/utils/awaiter-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\awaiter\utils\awaiter-utils.ts
  2:27  error  'SOCKET_EVENTS' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/mcp/mcp-servers/followup/followup-mcp-server.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\mcp\mcp-servers\followup\followup-mcp-server.ts
  49:20  error  'error' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/routes/utils/auth-routes-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\routes\utils\auth-routes-utils.ts
    1:25  error  'RawSocket' is defined but never used     @typescript-eslint/no-unused-vars
   18:3   error  'ToolsList' is defined but never used     @typescript-eslint/no-unused-vars
   38:8   error  'toolsService' is defined but never used  @typescript-eslint/no-unused-vars
  110:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  137:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  163:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  210:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  249:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  277:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  306:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  351:12  error  'error' is defined but never used         @typescript-eslint/no-unused-vars
  351:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  455:12  error  'error' is defined but never used         @typescript-eslint/no-unused-vars
  455:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  462:60  error  'data' is defined but never used          @typescript-eslint/no-unused-vars
  475:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  496:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  555:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 18 problems (18 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/routes/authRoutes.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\routes\authRoutes.ts
  10:25  error  'RawSocket' is defined but never used           @typescript-eslint/no-unused-vars
  11:16  error  'UserRole' is defined but never used            @typescript-eslint/no-unused-vars
  11:26  error  'AuthResponseData' is defined but never used    @typescript-eslint/no-unused-vars
  11:44  error  'UpdateUserData' is defined but never used      @typescript-eslint/no-unused-vars
  11:60  error  'GlobalPermissions' is defined but never used   @typescript-eslint/no-unused-vars
  11:79  error  'AppPermission' is defined but never used       @typescript-eslint/no-unused-vars
  13:10  error  'RoleManager' is defined but never used         @typescript-eslint/no-unused-vars
  14:10  error  'getRoleManager' is defined but never used      @typescript-eslint/no-unused-vars
  15:8   error  'userService' is defined but never used         @typescript-eslint/no-unused-vars
  15:23  error  'UserService' is defined but never used         @typescript-eslint/no-unused-vars
  23:3   error  'AuthStateEventData' is defined but never used  @typescript-eslint/no-unused-vars
  26:3   error  'ResponseData' is defined but never used        @typescript-eslint/no-unused-vars
  27:3   error  'FindUserData' is defined but never used        @typescript-eslint/no-unused-vars
  33:3   error  'FindByEmailData' is defined but never used     @typescript-eslint/no-unused-vars

✖ 14 problems (14 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/routes/platform-app-seed-data.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\routes\platform-app-seed-data.ts
  115:16  error  'postAppSeedAction' is defined but never used    @typescript-eslint/no-unused-vars
  149:10  error  'parseSeedActionBody' is defined but never used  @typescript-eslint/no-unused-vars
  173:16  error  'resolveAppServerUrl' is defined but never used  @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/mcp-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\mcp-utils.ts
   14:3    error  'addTodoItemSchemaFields' is defined but never used     @typescript-eslint/no-unused-vars
   31:26   error  'MAX_CONSECUTIVE_FAILURES' is defined but never used    @typescript-eslint/no-unused-vars
   72:96   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
   74:93   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
   75:57   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
   90:41   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  189:105  error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  447:15   error  'toolResultWrapped' is assigned a value but never used  @typescript-eslint/no-unused-vars
  586:23   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any

✖ 9 problems (9 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/template-resolvers/persona-resolver.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\template-resolvers\persona-resolver.ts
  12:3  error  '_isDeveloperMode' is defined but never used  @typescript-eslint/no-unused-vars
  13:3  error  '_providerData' is defined but never used     @typescript-eslint/no-unused-vars
  14:3  error  '_templateData' is defined but never used     @typescript-eslint/no-unused-vars
  31:3  error  '_sessionId' is defined but never used        @typescript-eslint/no-unused-vars
  32:3  error  '_persona' is defined but never used          @typescript-eslint/no-unused-vars
  33:3  error  '_isDeveloperMode' is defined but never used  @typescript-eslint/no-unused-vars
  34:3  error  '_providerData' is defined but never used     @typescript-eslint/no-unused-vars
  35:3  error  '_templateData' is defined but never used     @typescript-eslint/no-unused-vars

✖ 8 problems (8 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/type-script-validator.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\type-script-validator.ts
   1:10  error  'spawn' is defined but never used                   @typescript-eslint/no-unused-vars
  16:5   error  'utilPromisify' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/app-database-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\app-database-utils.ts
   43:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   59:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   71:78  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   76:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   93:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  165:27  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  184:41  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 7 problems (7 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/lint-file.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\lint-file.ts
   1:10  error  'spawn' is defined but never used                   @typescript-eslint/no-unused-vars
   1:17  error  'exec' is defined but never used                    @typescript-eslint/no-unused-vars
   1:23  error  'ChildProcess' is defined but never used            @typescript-eslint/no-unused-vars
   1:37  error  'ExecException' is defined but never used           @typescript-eslint/no-unused-vars
  15:48  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
  16:5   error  'utilPromisify' is assigned a value but never used  @typescript-eslint/no-unused-vars
  16:43  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any

✖ 7 problems (7 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/agent-response-parser.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\agent-response-parser.ts
  173:49  error  The `Function` type accepts any function-like value.
Prefer explicitly defining any function parameters and return type  @typescript-eslint/no-unsafe-function-type
  446:37  error  The `Function` type accepts any function-like value.
Prefer explicitly defining any function parameters and return type  @typescript-eslint/no-unsafe-function-type
  453:39  error  The `Function` type accepts any function-like value.
Prefer explicitly defining any function parameters and return type  @typescript-eslint/no-unsafe-function-type
  474:37  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
  490:44  error  The `Function` type accepts any function-like value.
Prefer explicitly defining any function parameters and return type  @typescript-eslint/no-unsafe-function-type

✖ 5 problems (5 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/logger.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\logger.ts
    3:20  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
    4:22  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
    5:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  146:31  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/file-helpers.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\file-helpers.ts
  11:25  error  'ICommand' is defined but never used                    @typescript-eslint/no-unused-vars
  16:3   error  'getRepoFileIndexGeneration' is defined but never used  @typescript-eslint/no-unused-vars
  17:3   error  'isRepoFileIndexFresh' is defined but never used        @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/failure-tracker.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\failure-tracker.ts
    1:10  error  'MCPToolResponse' is defined but never used        @typescript-eslint/no-unused-vars
  169:17  error  'compositeKey' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/mcp-production-enforcer.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\mcp-production-enforcer.ts
   8:3   error  'resolveTargetAppIdsFromToolParams' is defined but never used  @typescript-eslint/no-unused-vars
  40:38  error  Unexpected any. Specify a different type                       @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/parse-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\parse-utils.ts
  1:33  error  'MCPToolCall' is defined but never used    @typescript-eslint/no-unused-vars
  2:10  error  'AgentResponse' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/template-manager.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\template-manager.ts
  121:11  error  'nativeToolCalls' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/utils/tool-call-execution-context.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\utils\tool-call-execution-context.ts
  106:22  error  '_removed' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/auth/index.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\auth\index.ts
    7:10  error  'UserRegistrationData' is defined but never used                  @typescript-eslint/no-unused-vars
    7:32  error  'UserLoginData' is defined but never used                         @typescript-eslint/no-unused-vars
   32:18  error  An interface declaring no members is equivalent to its supertype  @typescript-eslint/no-empty-object-type
   93:29  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  105:10  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  129:16  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  144:16  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  209:89  error  'hash' is defined but never used                                  @typescript-eslint/no-unused-vars

✖ 8 problems (8 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/ai-providers.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\ai-providers.ts
   2:10  error  'ICommand' is defined but never used                              @typescript-eslint/no-unused-vars
   3:10  error  'IContextSettings' is defined but never used                      @typescript-eslint/no-unused-vars
   4:10  error  'ToolsList' is defined but never used                             @typescript-eslint/no-unused-vars
   5:10  error  'Persona' is defined but never used                               @typescript-eslint/no-unused-vars
  25:18  error  An interface declaring no members is equivalent to its supertype  @typescript-eslint/no-empty-object-type
  27:18  error  An interface declaring no members is equivalent to its supertype  @typescript-eslint/no-empty-object-type

✖ 6 problems (6 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/socket-events.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\socket-events.ts
   69:29  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  168:13  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  202:10  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  205:18  error  An interface declaring no members is equivalent to its supertype  @typescript-eslint/no-empty-object-type
  312:18  error  An interface declaring no members is equivalent to its supertype  @typescript-eslint/no-empty-object-type

✖ 5 problems (5 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/chat.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\chat.ts
    4:10  error  'FollowupEventData' is defined but never used  @typescript-eslint/no-unused-vars
   90:11  error  Unexpected any. Specify a different type       @typescript-eslint/no-explicit-any
  161:28  error  Unexpected any. Specify a different type       @typescript-eslint/no-explicit-any
  191:28  error  Unexpected any. Specify a different type       @typescript-eslint/no-explicit-any

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/lab-db.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\lab-db.ts
   2:29  error  'UIChatMessage' is defined but never used  @typescript-eslint/no-unused-vars
   2:44  error  'TodoList' is defined but never used       @typescript-eslint/no-unused-vars
  32:42  error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
  33:39  error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/app/app.d.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\app\app.d.ts
  157:15  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  176:15  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  177:14  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/forms-builder-integration.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\forms-builder-integration.ts
  47:10  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  61:26  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  62:51  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/mcp-tools.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\mcp-tools.ts
  29:23  error  Unexpected any. Specify a different type                                                                                                                                                                                                                                                                                                                                                   @typescript-eslint/no-explicit-any
  31:34  error  Unexpected any. Specify a different type                                                                                                                                                                                                                                                                                                                                                   @typescript-eslint/no-explicit-any
  35:19  error  The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
- If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
- If you want a type meaning "any object", you probably want `object` instead.
- If you want a type meaning "any value", you probably want `unknown` instead  @typescript-eslint/no-empty-object-type

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/llm-provider.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\llm-provider.ts
  74:43  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  87:37  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/mcp-servers.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\mcp-servers.ts
  24:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  41:11  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/app/App.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\app\App.ts
  1:10  error  'Component' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/todo-list.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\todo-list.ts
  1:10  error  'z' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/user.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\user.ts
  1:10  error  'AiProvider' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/app-management-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\app-management-format-result.ts
    2:3   error  'createAppSchemaFields' is defined but never used  @typescript-eslint/no-unused-vars
    3:3   error  'getAppSchemaFields' is defined but never used     @typescript-eslint/no-unused-vars
    4:3   error  'getAppsSchemaFields' is defined but never used    @typescript-eslint/no-unused-vars
    5:3   error  'updateAppSchemaFields' is defined but never used  @typescript-eslint/no-unused-vars
    6:3   error  'deleteAppSchemaFields' is defined but never used  @typescript-eslint/no-unused-vars
   69:34  error  Unexpected any. Specify a different type           @typescript-eslint/no-explicit-any
  166:15  error  'appId' is assigned a value but never used         @typescript-eslint/no-unused-vars
  183:70  error  Unexpected any. Specify a different type           @typescript-eslint/no-explicit-any

✖ 8 problems (8 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/base-utils.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\base-utils.ts
    2:90   error  'MCPToolCall' is defined but never used         @typescript-eslint/no-unused-vars
    2:103  error  'MCPToolResponse' is defined but never used     @typescript-eslint/no-unused-vars
  161:129  error  'altPath' is defined but never used             @typescript-eslint/no-unused-vars
  216:9    error  'overwrite' is assigned a value but never used  @typescript-eslint/no-unused-vars
  237:27   error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any
  278:41   error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

✖ 6 problems (6 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/followup-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\followup-format-result.ts
   5:10  error  'z' is defined but never used                     @typescript-eslint/no-unused-vars
   7:10  error  'FollowupParamsSchema' is defined but never used  @typescript-eslint/no-unused-vars
   7:32  error  'Option' is defined but never used                @typescript-eslint/no-unused-vars
   7:40  error  'FollowupParams' is defined but never used        @typescript-eslint/no-unused-vars
  51:41  error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  51:46  error  'index' is defined but never used                 @typescript-eslint/no-unused-vars

✖ 6 problems (6 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/mcp/utils/todo-list-format-result.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\todo-list-format-result.ts
   20:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   34:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  151:45  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  153:57  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 4 problems (4 errors, 0 warnings)


=== TYPE ERRORS FOR FILE: src/dashboard/components/app/AppContainer.vue ===
src/dashboard/components/app/AppContainer.vue(60,3): error TS2322: Type 'string' is not assignable to type 'CatalogHeroPresentation'.
src/dashboard/components/app/AppContainer.vue(61,32): error TS2345: Argument of type 'string' is not assignable to parameter of type 'CatalogHeroPresentation'.


=== TYPE ERRORS FOR FILE: src/dashboard/components/app/AppCard.vue ===
src/dashboard/components/app/AppCard.vue(389,33): error TS2551: Property 'visibleCatalogTagBadges' does not exist on type '{ canViewApp: boolean; canLaunchApp: boolean; handleTeardown: () => void; handleLaunch: () => void; platformHeroClass: string; catalogTagBadges: { id: string; label: string; }[]; appTypeLabel: "Browser" | "Full-stack" | "Server"; ... 45 more ...; $toast: ToastServiceMethods; }'. Did you mean 'catalogTagBadges'?
src/dashboard/components/app/AppCard.vue(394,23): error TS2339: Property 'hiddenCatalogTagBadgeCount' does not exist on type '{ canViewApp: boolean; canLaunchApp: boolean; handleTeardown: () => void; handleLaunch: () => void; platformHeroClass: string; catalogTagBadges: { id: string; label: string; }[]; appTypeLabel: "Browser" | "Full-stack" | "Server"; ... 45 more ...; $toast: ToastServiceMethods; }'.
src/dashboard/components/app/AppCard.vue(396,20): error TS2339: Property 'hiddenCatalogTagBadgeCount' does not exist on type '{ canViewApp: boolean; canLaunchApp: boolean; handleTeardown: () => void; handleLaunch: () => void; platformHeroClass: string; catalogTagBadges: { id: string; label: string; }[]; appTypeLabel: "Browser" | "Full-stack" | "Server"; ... 45 more ...; $toast: ToastServiceMethods; }'.


=== LINT ERRORS FOR FILE: src/shared/composables/** ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\app-view-layout-utils.ts
  9:3  error  'ANCHORED_HOST_SPLIT_RATIO' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useApiManagement.ts
  1:10  error  'Ref' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useCommandManagement.ts
  2:29  error  'ChatPersona' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useContextManagement.ts
  1:38  error  'watch' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useFileOverview.ts
   32:22  error  'value' is assigned a value but never used      @typescript-eslint/no-unused-vars
   75:31  error  'diffs' is assigned a value but never used      @typescript-eslint/no-unused-vars
   76:69  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any
  169:40  error  'content' is assigned a value but never used    @typescript-eslint/no-unused-vars
  169:49  error  'overwrite' is assigned a value but never used  @typescript-eslint/no-unused-vars
  172:71  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any
  208:40  error  'diffs' is assigned a value but never used      @typescript-eslint/no-unused-vars
  211:71  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useMCPServerManagement.ts
    1:25  error  'watch' is defined but never used     @typescript-eslint/no-unused-vars
  165:33  error  'serverId' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useMessageInput.ts
    8:10  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   31:28  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   42:42  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   42:79  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   58:44  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   69:43  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
  183:32  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
  183:46  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
  267:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  287:9   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  404:36  error  'index' is defined but never used                                      @typescript-eslint/no-unused-vars
  440:45  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useMessagesView.ts
   1:15   error  'Ref' is defined but never used              @typescript-eslint/no-unused-vars
   1:30   error  'defineEmits' is defined but never used      @typescript-eslint/no-unused-vars
   1:43   error  'watch' is defined but never used            @typescript-eslint/no-unused-vars
   2:44   error  'MCPToolCall' is defined but never used      @typescript-eslint/no-unused-vars
   2:57   error  'MCPToolResponse' is defined but never used  @typescript-eslint/no-unused-vars
   2:104  error  'ChatMessage' is defined but never used      @typescript-eslint/no-unused-vars
   2:141  error  'ChatPersona' is defined but never used      @typescript-eslint/no-unused-vars
  88:36   error  Unexpected any. Specify a different type     @typescript-eslint/no-explicit-any
  90:43   error  Unexpected any. Specify a different type     @typescript-eslint/no-explicit-any
  97:28   error  Unexpected any. Specify a different type     @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\usePersonaManagement.ts
  2:67  error  'ICommand' is defined but never used     @typescript-eslint/no-unused-vars
  2:77  error  'ToolsList' is defined but never used    @typescript-eslint/no-unused-vars
  2:88  error  'ChatPersona' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useSystemMessageManagement.ts
  2:25  error  'onMounted' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useTodoList.ts
  50:25  error  'toolresult' is assigned a value but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useUserManagement.ts
    2:89  error  'UserStatus' is defined but never used                                 @typescript-eslint/no-unused-vars
  100:24  error  'user' is defined but never used                                       @typescript-eslint/no-unused-vars
  148:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  149:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  150:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  151:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  161:9   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  162:9   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  163:9   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  196:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  197:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  204:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  205:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  267:14  error  'err' is defined but never used                                        @typescript-eslint/no-unused-vars
  267:19  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\useMcpToolFormatter.ts
    2:74   error  'FileOperations' is defined but never used  @typescript-eslint/no-unused-vars
  201:124  error  'altPath' is defined but never used         @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\app-management-format-result.ts
    2:3   error  'createAppSchemaFields' is defined but never used  @typescript-eslint/no-unused-vars
    3:3   error  'getAppSchemaFields' is defined but never used     @typescript-eslint/no-unused-vars
    4:3   error  'getAppsSchemaFields' is defined but never used    @typescript-eslint/no-unused-vars
    5:3   error  'updateAppSchemaFields' is defined but never used  @typescript-eslint/no-unused-vars
    6:3   error  'deleteAppSchemaFields' is defined but never used  @typescript-eslint/no-unused-vars
   69:34  error  Unexpected any. Specify a different type           @typescript-eslint/no-explicit-any
  166:15  error  'appId' is assigned a value but never used         @typescript-eslint/no-unused-vars
  183:70  error  Unexpected any. Specify a different type           @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\awaiter-format-result.ts
  8:9  error  'paramsResult' is assigned a value but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\base-utils.ts
    2:90   error  'MCPToolCall' is defined but never used         @typescript-eslint/no-unused-vars
    2:103  error  'MCPToolResponse' is defined but never used     @typescript-eslint/no-unused-vars
  161:129  error  'altPath' is defined but never used             @typescript-eslint/no-unused-vars
  216:9    error  'overwrite' is assigned a value but never used  @typescript-eslint/no-unused-vars
  237:27   error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any
  278:41   error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\context7-format-result.ts
   1:10  error  'ZodSafeParseResult' is defined but never used  @typescript-eslint/no-unused-vars
  47:30  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\create-directory-format-result.ts
  1:10  error  'ZodSafeParseResult' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\create-file-format-result.ts
   6:9   error  'content' is assigned a value but never used  @typescript-eslint/no-unused-vars
  18:13  error  'path' is assigned a value but never used     @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\documentor-format-result.ts
  1:10  error  'ZodSafeParseResult' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\followup-format-result.ts
   5:10  error  'z' is defined but never used                     @typescript-eslint/no-unused-vars
   7:10  error  'FollowupParamsSchema' is defined but never used  @typescript-eslint/no-unused-vars
   7:32  error  'Option' is defined but never used                @typescript-eslint/no-unused-vars
   7:40  error  'FollowupParams' is defined but never used        @typescript-eslint/no-unused-vars
  51:41  error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  51:46  error  'index' is defined but never used                 @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\list-files-format-result.ts
  6:13  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  9:12  error  'e' is defined but never used             @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\persona-manager-format-result.ts
    1:10  error  'ZodSafeParseResult' is defined but never used  @typescript-eslint/no-unused-vars
   48:28  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any
  111:30  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\read-file-format-result.ts
  1:10  error  'ZodSafeParseResult' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\remove-file-format-result.ts
  10:13  error  'path' is assigned a value but never used            @typescript-eslint/no-unused-vars
  10:25  error  'totalRemovals' is assigned a value but never used   @typescript-eslint/no-unused-vars
  10:40  error  'totalAdditions' is assigned a value but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\search-repository-format-result.ts
  13:13  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  16:12  error  'e' is defined but never used             @typescript-eslint/no-unused-vars
  39:27  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\todo-list-format-result.ts
   20:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   34:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  151:45  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  153:57  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\update-file-format-result.ts
   1:10  error  'z' is defined but never used           @typescript-eslint/no-unused-vars
  33:16  error  'parseError' is defined but never used  @typescript-eslint/no-unused-vars
  55:16  error  'parseError' is defined but never used  @typescript-eslint/no-unused-vars
  83:16  error  'parseError' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\web-query-format-result.ts
   6:13  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   9:12  error  'e' is defined but never used             @typescript-eslint/no-unused-vars
  36:35  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useAuthHandlers.ts
  4:26  error  'getAuthUser' is defined but never used          @typescript-eslint/no-unused-vars
  4:68  error  'isUserAuthenticated' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useInputFileHandler.ts
    2:10  error  'useToast' is defined but never used                                                                                     @typescript-eslint/no-unused-vars
   33:33  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
   48:33  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
   50:33  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
   83:53  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
   84:31  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
  133:32  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
  147:64  error  The `Function` type accepts any function-like value.
Prefer explicitly defining any function parameters and return type  @typescript-eslint/no-unsafe-function-type
  203:53  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
  204:31  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
  217:29  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useMessageHandlers.ts
   1:10   error  'ref' is defined but never used                  @typescript-eslint/no-unused-vars
   4:251  error  'SocketErrorEvent' is defined but never used     @typescript-eslint/no-unused-vars
   4:291  error  'ChatInitializedData' is defined but never used  @typescript-eslint/no-unused-vars
  25:9    error  'toast' is assigned a value but never used       @typescript-eslint/no-unused-vars
  93:32   error  'err' is defined but never used                  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useProviderHandlers.ts
   1:10  error  'ref' is defined but never used   @typescript-eslint/no-unused-vars
  46:41  error  'data' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useSessionHandlers.ts
   1:10   error  'ref' is defined but never used                         @typescript-eslint/no-unused-vars
   4:133  error  'NewSessionCreatedEventData' is defined but never used  @typescript-eslint/no-unused-vars
  10:43   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  11:32   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  13:45   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any

✖ 133 problems (133 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/** ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\ai-providers.ts
   2:10  error  'ICommand' is defined but never used                              @typescript-eslint/no-unused-vars
   3:10  error  'IContextSettings' is defined but never used                      @typescript-eslint/no-unused-vars
   4:10  error  'ToolsList' is defined but never used                             @typescript-eslint/no-unused-vars
   5:10  error  'Persona' is defined but never used                               @typescript-eslint/no-unused-vars
  25:18  error  An interface declaring no members is equivalent to its supertype  @typescript-eslint/no-empty-object-type
  27:18  error  An interface declaring no members is equivalent to its supertype  @typescript-eslint/no-empty-object-type

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\app\App.ts
  1:10  error  'Component' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\app\app.d.ts
  157:15  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  176:15  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  177:14  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\auth\index.ts
    7:10  error  'UserRegistrationData' is defined but never used                  @typescript-eslint/no-unused-vars
    7:32  error  'UserLoginData' is defined but never used                         @typescript-eslint/no-unused-vars
   32:18  error  An interface declaring no members is equivalent to its supertype  @typescript-eslint/no-empty-object-type
   93:29  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  105:10  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  129:16  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  144:16  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  209:89  error  'hash' is defined but never used                                  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\chat.ts
    4:10  error  'FollowupEventData' is defined but never used  @typescript-eslint/no-unused-vars
   90:11  error  Unexpected any. Specify a different type       @typescript-eslint/no-explicit-any
  161:28  error  Unexpected any. Specify a different type       @typescript-eslint/no-explicit-any
  191:28  error  Unexpected any. Specify a different type       @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\forms-builder-integration.ts
  47:10  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  61:26  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  62:51  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\lab-db.ts
   2:29  error  'UIChatMessage' is defined but never used  @typescript-eslint/no-unused-vars
   2:44  error  'TodoList' is defined but never used       @typescript-eslint/no-unused-vars
  32:42  error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
  33:39  error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\llm-provider.ts
  74:43  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  87:37  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\mcp-servers.ts
  24:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  41:11  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\mcp-tools.ts
  29:23  error  Unexpected any. Specify a different type                                                                                                                                                                                                                                                                                                                                                   @typescript-eslint/no-explicit-any
  31:34  error  Unexpected any. Specify a different type                                                                                                                                                                                                                                                                                                                                                   @typescript-eslint/no-explicit-any
  35:19  error  The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
- If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
- If you want a type meaning "any object", you probably want `object` instead.
- If you want a type meaning "any value", you probably want `unknown` instead  @typescript-eslint/no-empty-object-type

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\socket-events.ts
   69:29  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  168:13  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  202:10  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  205:18  error  An interface declaring no members is equivalent to its supertype  @typescript-eslint/no-empty-object-type
  312:18  error  An interface declaring no members is equivalent to its supertype  @typescript-eslint/no-empty-object-type

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\todo-list.ts
  1:10  error  'z' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\user.ts
  1:10  error  'AiProvider' is defined but never used  @typescript-eslint/no-unused-vars

✖ 43 problems (43 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/services/** ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\services\AppRegistry.ts
   19:16  error  'IServerConfig' is defined but never used         @typescript-eslint/no-unused-vars
   19:44  error  'AppConfigWithAppType' is defined but never used  @typescript-eslint/no-unused-vars
   19:78  error  'AppType' is defined but never used               @typescript-eslint/no-unused-vars
   27:68  error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  421:30  error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  422:34  error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\services\AppUpdateManager.ts
   74:59  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
   74:87  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
   81:53  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
  117:39  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
  144:39  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
  175:19  error  'formattedPath' is assigned a value but never used  @typescript-eslint/no-unused-vars
  278:39  error  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\services\RoleManager.ts
  10:43  error  'AppPermission' is defined but never used      @typescript-eslint/no-unused-vars
  10:58  error  'GlobalPermissions' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\services\ServerAppRegistry.ts
   12:64  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   35:65  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   52:63  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   69:68  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  118:61  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  130:47  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\services\TemplateGenerator.ts
   92:21   error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
  161:109  error  'port' is assigned a value but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\services\ui-automation-handler.ts
  412:20  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 24 problems (24 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/utils/** ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\utils\mcp-tool-json-schema.ts
   52:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   52:54  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   52:59  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   56:41  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   60:64  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   94:38  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  104:36  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  139:39  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  139:45  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  172:29  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  176:29  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\utils\mention-blot.ts
   2:15  error  'InlineBlot' is defined but never used    @typescript-eslint/no-unused-vars
   9:46  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  22:12  error  'context' is defined but never used       @typescript-eslint/no-unused-vars
  22:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  27:22  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  27:32  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\utils\public-user.ts
  4:25  error  '_omit' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 18 problems (18 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/** ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\app-view-layout-utils.ts
  9:3  error  'ANCHORED_HOST_SPLIT_RATIO' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useApiManagement.ts
  1:10  error  'Ref' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useCommandManagement.ts
  2:29  error  'ChatPersona' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useContextManagement.ts
  1:38  error  'watch' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useFileOverview.ts
   32:22  error  'value' is assigned a value but never used      @typescript-eslint/no-unused-vars
   75:31  error  'diffs' is assigned a value but never used      @typescript-eslint/no-unused-vars
   76:69  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any
  169:40  error  'content' is assigned a value but never used    @typescript-eslint/no-unused-vars
  169:49  error  'overwrite' is assigned a value but never used  @typescript-eslint/no-unused-vars
  172:71  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any
  208:40  error  'diffs' is assigned a value but never used      @typescript-eslint/no-unused-vars
  211:71  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useMCPServerManagement.ts
    1:25  error  'watch' is defined but never used     @typescript-eslint/no-unused-vars
  165:33  error  'serverId' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useMessageInput.ts
    8:10  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   31:28  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   42:42  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   42:79  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   58:44  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   69:43  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
  183:32  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
  183:46  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
  267:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  287:9   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  404:36  error  'index' is defined but never used                                      @typescript-eslint/no-unused-vars
  440:45  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useMessagesView.ts
   1:15   error  'Ref' is defined but never used              @typescript-eslint/no-unused-vars
   1:30   error  'defineEmits' is defined but never used      @typescript-eslint/no-unused-vars
   1:43   error  'watch' is defined but never used            @typescript-eslint/no-unused-vars
   2:44   error  'MCPToolCall' is defined but never used      @typescript-eslint/no-unused-vars
   2:57   error  'MCPToolResponse' is defined but never used  @typescript-eslint/no-unused-vars
   2:104  error  'ChatMessage' is defined but never used      @typescript-eslint/no-unused-vars
   2:141  error  'ChatPersona' is defined but never used      @typescript-eslint/no-unused-vars
  88:36   error  Unexpected any. Specify a different type     @typescript-eslint/no-explicit-any
  90:43   error  Unexpected any. Specify a different type     @typescript-eslint/no-explicit-any
  97:28   error  Unexpected any. Specify a different type     @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\usePersonaManagement.ts
  2:67  error  'ICommand' is defined but never used     @typescript-eslint/no-unused-vars
  2:77  error  'ToolsList' is defined but never used    @typescript-eslint/no-unused-vars
  2:88  error  'ChatPersona' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useSystemMessageManagement.ts
  2:25  error  'onMounted' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useTodoList.ts
  50:25  error  'toolresult' is assigned a value but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useUserManagement.ts
    2:89  error  'UserStatus' is defined but never used                                 @typescript-eslint/no-unused-vars
  100:24  error  'user' is defined but never used                                       @typescript-eslint/no-unused-vars
  148:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  149:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  150:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  151:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  161:9   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  162:9   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  163:9   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  196:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  197:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  204:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  205:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  267:14  error  'err' is defined but never used                                        @typescript-eslint/no-unused-vars
  267:19  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\useMcpToolFormatter.ts
    2:74   error  'FileOperations' is defined but never used  @typescript-eslint/no-unused-vars
  201:124  error  'altPath' is defined but never used         @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\app-management-format-result.ts
    2:3   error  'createAppSchemaFields' is defined but never used  @typescript-eslint/no-unused-vars
    3:3   error  'getAppSchemaFields' is defined but never used     @typescript-eslint/no-unused-vars
    4:3   error  'getAppsSchemaFields' is defined but never used    @typescript-eslint/no-unused-vars
    5:3   error  'updateAppSchemaFields' is defined but never used  @typescript-eslint/no-unused-vars
    6:3   error  'deleteAppSchemaFields' is defined but never used  @typescript-eslint/no-unused-vars
   69:34  error  Unexpected any. Specify a different type           @typescript-eslint/no-explicit-any
  166:15  error  'appId' is assigned a value but never used         @typescript-eslint/no-unused-vars
  183:70  error  Unexpected any. Specify a different type           @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\awaiter-format-result.ts
  8:9  error  'paramsResult' is assigned a value but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\base-utils.ts
    2:90   error  'MCPToolCall' is defined but never used         @typescript-eslint/no-unused-vars
    2:103  error  'MCPToolResponse' is defined but never used     @typescript-eslint/no-unused-vars
  161:129  error  'altPath' is defined but never used             @typescript-eslint/no-unused-vars
  216:9    error  'overwrite' is assigned a value but never used  @typescript-eslint/no-unused-vars
  237:27   error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any
  278:41   error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\context7-format-result.ts
   1:10  error  'ZodSafeParseResult' is defined but never used  @typescript-eslint/no-unused-vars
  47:30  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\create-directory-format-result.ts
  1:10  error  'ZodSafeParseResult' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\create-file-format-result.ts
   6:9   error  'content' is assigned a value but never used  @typescript-eslint/no-unused-vars
  18:13  error  'path' is assigned a value but never used     @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\documentor-format-result.ts
  1:10  error  'ZodSafeParseResult' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\followup-format-result.ts
   5:10  error  'z' is defined but never used                     @typescript-eslint/no-unused-vars
   7:10  error  'FollowupParamsSchema' is defined but never used  @typescript-eslint/no-unused-vars
   7:32  error  'Option' is defined but never used                @typescript-eslint/no-unused-vars
   7:40  error  'FollowupParams' is defined but never used        @typescript-eslint/no-unused-vars
  51:41  error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  51:46  error  'index' is defined but never used                 @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\list-files-format-result.ts
  6:13  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  9:12  error  'e' is defined but never used             @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\persona-manager-format-result.ts
    1:10  error  'ZodSafeParseResult' is defined but never used  @typescript-eslint/no-unused-vars
   48:28  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any
  111:30  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\read-file-format-result.ts
  1:10  error  'ZodSafeParseResult' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\remove-file-format-result.ts
  10:13  error  'path' is assigned a value but never used            @typescript-eslint/no-unused-vars
  10:25  error  'totalRemovals' is assigned a value but never used   @typescript-eslint/no-unused-vars
  10:40  error  'totalAdditions' is assigned a value but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\search-repository-format-result.ts
  13:13  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  16:12  error  'e' is defined but never used             @typescript-eslint/no-unused-vars
  39:27  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\todo-list-format-result.ts
   20:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   34:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  151:45  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  153:57  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\update-file-format-result.ts
   1:10  error  'z' is defined but never used           @typescript-eslint/no-unused-vars
  33:16  error  'parseError' is defined but never used  @typescript-eslint/no-unused-vars
  55:16  error  'parseError' is defined but never used  @typescript-eslint/no-unused-vars
  83:16  error  'parseError' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\web-query-format-result.ts
   6:13  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   9:12  error  'e' is defined but never used             @typescript-eslint/no-unused-vars
  36:35  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useAuthHandlers.ts
  4:26  error  'getAuthUser' is defined but never used          @typescript-eslint/no-unused-vars
  4:68  error  'isUserAuthenticated' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useInputFileHandler.ts
    2:10  error  'useToast' is defined but never used                                                                                     @typescript-eslint/no-unused-vars
   33:33  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
   48:33  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
   50:33  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
   83:53  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
   84:31  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
  133:32  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
  147:64  error  The `Function` type accepts any function-like value.
Prefer explicitly defining any function parameters and return type  @typescript-eslint/no-unsafe-function-type
  203:53  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
  204:31  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
  217:29  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useMessageHandlers.ts
   1:10   error  'ref' is defined but never used                  @typescript-eslint/no-unused-vars
   4:251  error  'SocketErrorEvent' is defined but never used     @typescript-eslint/no-unused-vars
   4:291  error  'ChatInitializedData' is defined but never used  @typescript-eslint/no-unused-vars
  25:9    error  'toast' is assigned a value but never used       @typescript-eslint/no-unused-vars
  93:32   error  'err' is defined but never used                  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useProviderHandlers.ts
   1:10  error  'ref' is defined but never used   @typescript-eslint/no-unused-vars
  46:41  error  'data' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useSessionHandlers.ts
   1:10   error  'ref' is defined but never used                         @typescript-eslint/no-unused-vars
   4:133  error  'NewSessionCreatedEventData' is defined but never used  @typescript-eslint/no-unused-vars
  10:43   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  11:32   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  13:45   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any

✖ 133 problems (133 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/** ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\app\App.ts
  1:10  error  'Component' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\app\app.d.ts
  157:15  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  176:15  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  177:14  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\auth\index.ts
  208:89  error  'hash' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\forms-builder-integration.ts
  47:10  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  61:26  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  62:51  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\llm-provider.ts
  74:43  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  87:37  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\mcp-servers.ts
  24:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  41:11  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\socket-events.ts
   69:29  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  168:13  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  202:10  error  Unexpected any. Specify a different type                          @typescript-eslint/no-explicit-any
  205:18  error  An interface declaring no members is equivalent to its supertype  @typescript-eslint/no-empty-object-type
  312:18  error  An interface declaring no members is equivalent to its supertype  @typescript-eslint/no-empty-object-type

✖ 17 problems (17 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/app/** ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\app\App.ts
  1:10  error  'Component' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\app\app.d.ts
  157:15  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  176:15  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  177:14  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/** ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useFileOverview.ts
   32:22  error  'value' is assigned a value but never used      @typescript-eslint/no-unused-vars
   75:31  error  'diffs' is assigned a value but never used      @typescript-eslint/no-unused-vars
   76:69  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any
  169:40  error  'content' is assigned a value but never used    @typescript-eslint/no-unused-vars
  169:49  error  'overwrite' is assigned a value but never used  @typescript-eslint/no-unused-vars
  172:71  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any
  208:40  error  'diffs' is assigned a value but never used      @typescript-eslint/no-unused-vars
  211:71  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useMCPServerManagement.ts
  165:33  error  '_serverId' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useMessageInput.ts
    8:10  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   31:28  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   42:42  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   42:79  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   58:44  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   69:43  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
  183:32  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
  183:46  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
  267:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  287:9   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  404:36  error  'index' is defined but never used                                      @typescript-eslint/no-unused-vars
  440:45  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useMessagesView.ts
   1:15   error  'Ref' is defined but never used              @typescript-eslint/no-unused-vars
   1:30   error  'defineEmits' is defined but never used      @typescript-eslint/no-unused-vars
   1:43   error  'watch' is defined but never used            @typescript-eslint/no-unused-vars
   2:44   error  'MCPToolCall' is defined but never used      @typescript-eslint/no-unused-vars
   2:57   error  'MCPToolResponse' is defined but never used  @typescript-eslint/no-unused-vars
   2:104  error  'ChatMessage' is defined but never used      @typescript-eslint/no-unused-vars
   2:141  error  'ChatPersona' is defined but never used      @typescript-eslint/no-unused-vars
  88:36   error  Unexpected any. Specify a different type     @typescript-eslint/no-explicit-any
  90:43   error  Unexpected any. Specify a different type     @typescript-eslint/no-explicit-any
  97:28   error  Unexpected any. Specify a different type     @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useUserManagement.ts
  100:24  error  '_user' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\useMcpToolFormatter.ts
    2:74   error  'FileOperations' is defined but never used  @typescript-eslint/no-unused-vars
  201:124  error  'altPath' is defined but never used         @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\app-management-format-result.ts
    2:3   error  'createAppSchemaFields' is defined but never used  @typescript-eslint/no-unused-vars
    3:3   error  'getAppSchemaFields' is defined but never used     @typescript-eslint/no-unused-vars
    4:3   error  'getAppsSchemaFields' is defined but never used    @typescript-eslint/no-unused-vars
    5:3   error  'updateAppSchemaFields' is defined but never used  @typescript-eslint/no-unused-vars
    6:3   error  'deleteAppSchemaFields' is defined but never used  @typescript-eslint/no-unused-vars
   69:34  error  Unexpected any. Specify a different type           @typescript-eslint/no-explicit-any
  166:15  error  'appId' is assigned a value but never used         @typescript-eslint/no-unused-vars
  183:70  error  Unexpected any. Specify a different type           @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\base-utils.ts
    2:90   error  'MCPToolCall' is defined but never used         @typescript-eslint/no-unused-vars
    2:103  error  'MCPToolResponse' is defined but never used     @typescript-eslint/no-unused-vars
  161:129  error  'altPath' is defined but never used             @typescript-eslint/no-unused-vars
  216:9    error  'overwrite' is assigned a value but never used  @typescript-eslint/no-unused-vars
  237:27   error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any
  278:41   error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\context7-format-result.ts
   1:10  error  'ZodSafeParseResult' is defined but never used  @typescript-eslint/no-unused-vars
  47:30  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\create-file-format-result.ts
   5:103  error  'toolResult' is defined but never used     @typescript-eslint/no-unused-vars
  16:13   error  'path' is assigned a value but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\followup-format-result.ts
   5:10  error  'z' is defined but never used                     @typescript-eslint/no-unused-vars
   7:10  error  'FollowupParamsSchema' is defined but never used  @typescript-eslint/no-unused-vars
   7:32  error  'Option' is defined but never used                @typescript-eslint/no-unused-vars
   7:40  error  'FollowupParams' is defined but never used        @typescript-eslint/no-unused-vars
  51:41  error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  51:46  error  'index' is defined but never used                 @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\list-files-format-result.ts
  6:13  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  9:12  error  'e' is defined but never used             @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\persona-manager-format-result.ts
    1:10  error  'ZodSafeParseResult' is defined but never used  @typescript-eslint/no-unused-vars
   48:28  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any
  111:30  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\search-repository-format-result.ts
  13:13  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  16:12  error  'e' is defined but never used             @typescript-eslint/no-unused-vars
  39:27  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\todo-list-format-result.ts
   20:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   34:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  151:45  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  153:57  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\update-file-format-result.ts
   1:10  error  'z' is defined but never used           @typescript-eslint/no-unused-vars
  33:16  error  'parseError' is defined but never used  @typescript-eslint/no-unused-vars
  55:16  error  'parseError' is defined but never used  @typescript-eslint/no-unused-vars
  83:16  error  'parseError' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\web-query-format-result.ts
   6:13  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   9:12  error  'e' is defined but never used             @typescript-eslint/no-unused-vars
  36:35  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useInputFileHandler.ts
    2:10  error  'useToast' is defined but never used                                                                                     @typescript-eslint/no-unused-vars
   33:33  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
   48:33  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
   50:33  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
   83:53  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
   84:31  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
  133:32  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
  147:64  error  The `Function` type accepts any function-like value.
Prefer explicitly defining any function parameters and return type  @typescript-eslint/no-unsafe-function-type
  203:53  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
  204:31  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
  217:29  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useMessageHandlers.ts
  90:32  error  '_err' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useProviderHandlers.ts
  46:41  error  '_data' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useSessionHandlers.ts
   1:10   error  'ref' is defined but never used                         @typescript-eslint/no-unused-vars
   4:133  error  'NewSessionCreatedEventData' is defined but never used  @typescript-eslint/no-unused-vars
  10:43   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  11:32   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  13:45   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any

✖ 95 problems (95 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/** ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useFileOverview.ts
   32:22  error  'value' is assigned a value but never used      @typescript-eslint/no-unused-vars
   75:31  error  'diffs' is assigned a value but never used      @typescript-eslint/no-unused-vars
   76:69  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any
  169:40  error  'content' is assigned a value but never used    @typescript-eslint/no-unused-vars
  169:49  error  'overwrite' is assigned a value but never used  @typescript-eslint/no-unused-vars
  172:71  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any
  208:40  error  'diffs' is assigned a value but never used      @typescript-eslint/no-unused-vars
  211:71  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useMCPServerManagement.ts
  165:33  error  '_serverId' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useMessageInput.ts
    8:10  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   31:28  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   42:42  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   42:79  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   58:44  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   69:43  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
  183:32  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
  183:46  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
  267:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  287:9   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  404:36  error  'index' is defined but never used                                      @typescript-eslint/no-unused-vars
  440:45  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useMessagesView.ts
   1:15   error  'Ref' is defined but never used              @typescript-eslint/no-unused-vars
   1:30   error  'defineEmits' is defined but never used      @typescript-eslint/no-unused-vars
   1:43   error  'watch' is defined but never used            @typescript-eslint/no-unused-vars
   2:44   error  'MCPToolCall' is defined but never used      @typescript-eslint/no-unused-vars
   2:57   error  'MCPToolResponse' is defined but never used  @typescript-eslint/no-unused-vars
   2:104  error  'ChatMessage' is defined but never used      @typescript-eslint/no-unused-vars
   2:141  error  'ChatPersona' is defined but never used      @typescript-eslint/no-unused-vars
  88:36   error  Unexpected any. Specify a different type     @typescript-eslint/no-explicit-any
  90:43   error  Unexpected any. Specify a different type     @typescript-eslint/no-explicit-any
  97:28   error  Unexpected any. Specify a different type     @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useUserManagement.ts
  100:24  error  '_user' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\useMcpToolFormatter.ts
    2:74   error  'FileOperations' is defined but never used  @typescript-eslint/no-unused-vars
  201:124  error  'altPath' is defined but never used         @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\app-management-format-result.ts
    2:3   error  'createAppSchemaFields' is defined but never used  @typescript-eslint/no-unused-vars
    3:3   error  'getAppSchemaFields' is defined but never used     @typescript-eslint/no-unused-vars
    4:3   error  'getAppsSchemaFields' is defined but never used    @typescript-eslint/no-unused-vars
    5:3   error  'updateAppSchemaFields' is defined but never used  @typescript-eslint/no-unused-vars
    6:3   error  'deleteAppSchemaFields' is defined but never used  @typescript-eslint/no-unused-vars
   69:34  error  Unexpected any. Specify a different type           @typescript-eslint/no-explicit-any
  166:15  error  'appId' is assigned a value but never used         @typescript-eslint/no-unused-vars
  183:70  error  Unexpected any. Specify a different type           @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\base-utils.ts
    2:90   error  'MCPToolCall' is defined but never used         @typescript-eslint/no-unused-vars
    2:103  error  'MCPToolResponse' is defined but never used     @typescript-eslint/no-unused-vars
  161:129  error  'altPath' is defined but never used             @typescript-eslint/no-unused-vars
  216:9    error  'overwrite' is assigned a value but never used  @typescript-eslint/no-unused-vars
  237:27   error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any
  278:41   error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\context7-format-result.ts
   1:10  error  'ZodSafeParseResult' is defined but never used  @typescript-eslint/no-unused-vars
  47:30  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\create-file-format-result.ts
   5:103  error  'toolResult' is defined but never used     @typescript-eslint/no-unused-vars
  16:13   error  'path' is assigned a value but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\followup-format-result.ts
   5:10  error  'z' is defined but never used                     @typescript-eslint/no-unused-vars
   7:10  error  'FollowupParamsSchema' is defined but never used  @typescript-eslint/no-unused-vars
   7:32  error  'Option' is defined but never used                @typescript-eslint/no-unused-vars
   7:40  error  'FollowupParams' is defined but never used        @typescript-eslint/no-unused-vars
  51:41  error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  51:46  error  'index' is defined but never used                 @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\list-files-format-result.ts
  6:13  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  9:12  error  'e' is defined but never used             @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\persona-manager-format-result.ts
    1:10  error  'ZodSafeParseResult' is defined but never used  @typescript-eslint/no-unused-vars
   48:28  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any
  111:30  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\search-repository-format-result.ts
  13:13  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  16:12  error  'e' is defined but never used             @typescript-eslint/no-unused-vars
  39:27  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\todo-list-format-result.ts
   20:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   34:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  151:45  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  153:57  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\update-file-format-result.ts
   1:10  error  'z' is defined but never used           @typescript-eslint/no-unused-vars
  33:16  error  'parseError' is defined but never used  @typescript-eslint/no-unused-vars
  55:16  error  'parseError' is defined but never used  @typescript-eslint/no-unused-vars
  83:16  error  'parseError' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\web-query-format-result.ts
   6:13  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   9:12  error  'e' is defined but never used             @typescript-eslint/no-unused-vars
  36:35  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useInputFileHandler.ts
    2:10  error  'useToast' is defined but never used                                                                                     @typescript-eslint/no-unused-vars
   33:33  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
   48:33  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
   50:33  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
   83:53  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
   84:31  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
  133:32  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
  147:64  error  The `Function` type accepts any function-like value.
Prefer explicitly defining any function parameters and return type  @typescript-eslint/no-unsafe-function-type
  203:53  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
  204:31  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
  217:29  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useMessageHandlers.ts
  90:32  error  '_err' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useProviderHandlers.ts
  46:41  error  '_data' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useSessionHandlers.ts
   1:10   error  'ref' is defined but never used                         @typescript-eslint/no-unused-vars
   4:133  error  'NewSessionCreatedEventData' is defined but never used  @typescript-eslint/no-unused-vars
  10:43   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  11:32   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  13:45   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any

✖ 95 problems (95 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/** ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useFileOverview.ts
   32:22  error  'value' is assigned a value but never used      @typescript-eslint/no-unused-vars
   75:31  error  'diffs' is assigned a value but never used      @typescript-eslint/no-unused-vars
   76:69  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any
  169:40  error  'content' is assigned a value but never used    @typescript-eslint/no-unused-vars
  169:49  error  'overwrite' is assigned a value but never used  @typescript-eslint/no-unused-vars
  172:71  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any
  208:40  error  'diffs' is assigned a value but never used      @typescript-eslint/no-unused-vars
  211:71  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useMCPServerManagement.ts
  165:33  error  '_serverId' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useMessageInput.ts
    8:10  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   31:28  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   42:42  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   42:79  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   58:44  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
   69:43  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
  183:32  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
  183:46  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any
  267:7   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  287:9   error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  404:36  error  'index' is defined but never used                                      @typescript-eslint/no-unused-vars
  440:45  error  Unexpected any. Specify a different type                               @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useMessagesView.ts
   1:15   error  'Ref' is defined but never used              @typescript-eslint/no-unused-vars
   1:30   error  'defineEmits' is defined but never used      @typescript-eslint/no-unused-vars
   1:43   error  'watch' is defined but never used            @typescript-eslint/no-unused-vars
   2:44   error  'MCPToolCall' is defined but never used      @typescript-eslint/no-unused-vars
   2:57   error  'MCPToolResponse' is defined but never used  @typescript-eslint/no-unused-vars
   2:104  error  'ChatMessage' is defined but never used      @typescript-eslint/no-unused-vars
   2:141  error  'ChatPersona' is defined but never used      @typescript-eslint/no-unused-vars
  88:36   error  Unexpected any. Specify a different type     @typescript-eslint/no-explicit-any
  90:43   error  Unexpected any. Specify a different type     @typescript-eslint/no-explicit-any
  97:28   error  Unexpected any. Specify a different type     @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useUserManagement.ts
  100:24  error  '_user' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\useMcpToolFormatter.ts
    2:74   error  'FileOperations' is defined but never used  @typescript-eslint/no-unused-vars
  201:124  error  'altPath' is defined but never used         @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\app-management-format-result.ts
    2:3   error  'createAppSchemaFields' is defined but never used  @typescript-eslint/no-unused-vars
    3:3   error  'getAppSchemaFields' is defined but never used     @typescript-eslint/no-unused-vars
    4:3   error  'getAppsSchemaFields' is defined but never used    @typescript-eslint/no-unused-vars
    5:3   error  'updateAppSchemaFields' is defined but never used  @typescript-eslint/no-unused-vars
    6:3   error  'deleteAppSchemaFields' is defined but never used  @typescript-eslint/no-unused-vars
   69:34  error  Unexpected any. Specify a different type           @typescript-eslint/no-explicit-any
  166:15  error  'appId' is assigned a value but never used         @typescript-eslint/no-unused-vars
  183:70  error  Unexpected any. Specify a different type           @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\base-utils.ts
    2:90   error  'MCPToolCall' is defined but never used         @typescript-eslint/no-unused-vars
    2:103  error  'MCPToolResponse' is defined but never used     @typescript-eslint/no-unused-vars
  161:129  error  'altPath' is defined but never used             @typescript-eslint/no-unused-vars
  216:9    error  'overwrite' is assigned a value but never used  @typescript-eslint/no-unused-vars
  237:27   error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any
  278:41   error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\context7-format-result.ts
   1:10  error  'ZodSafeParseResult' is defined but never used  @typescript-eslint/no-unused-vars
  47:30  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\create-file-format-result.ts
   5:103  error  'toolResult' is defined but never used     @typescript-eslint/no-unused-vars
  16:13   error  'path' is assigned a value but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\followup-format-result.ts
   5:10  error  'z' is defined but never used                     @typescript-eslint/no-unused-vars
   7:10  error  'FollowupParamsSchema' is defined but never used  @typescript-eslint/no-unused-vars
   7:32  error  'Option' is defined but never used                @typescript-eslint/no-unused-vars
   7:40  error  'FollowupParams' is defined but never used        @typescript-eslint/no-unused-vars
  51:41  error  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  51:46  error  'index' is defined but never used                 @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\list-files-format-result.ts
  6:13  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  9:12  error  'e' is defined but never used             @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\persona-manager-format-result.ts
    1:10  error  'ZodSafeParseResult' is defined but never used  @typescript-eslint/no-unused-vars
   48:28  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any
  111:30  error  Unexpected any. Specify a different type        @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\search-repository-format-result.ts
  13:13  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  16:12  error  'e' is defined but never used             @typescript-eslint/no-unused-vars
  39:27  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\todo-list-format-result.ts
   20:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   34:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  151:45  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  153:57  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\update-file-format-result.ts
   1:10  error  'z' is defined but never used           @typescript-eslint/no-unused-vars
  33:16  error  'parseError' is defined but never used  @typescript-eslint/no-unused-vars
  55:16  error  'parseError' is defined but never used  @typescript-eslint/no-unused-vars
  83:16  error  'parseError' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\web-query-format-result.ts
   6:13  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   9:12  error  'e' is defined but never used             @typescript-eslint/no-unused-vars
  36:35  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useInputFileHandler.ts
    2:10  error  'useToast' is defined but never used                                                                                     @typescript-eslint/no-unused-vars
   33:33  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
   48:33  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
   50:33  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
   83:53  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
   84:31  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
  133:32  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
  147:64  error  The `Function` type accepts any function-like value.
Prefer explicitly defining any function parameters and return type  @typescript-eslint/no-unsafe-function-type
  203:53  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
  204:31  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any
  217:29  error  Unexpected any. Specify a different type                                                                                 @typescript-eslint/no-explicit-any

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useMessageHandlers.ts
  90:32  error  '_err' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useProviderHandlers.ts
  46:41  error  '_data' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useSessionHandlers.ts
   1:10   error  'ref' is defined but never used                         @typescript-eslint/no-unused-vars
   4:133  error  'NewSessionCreatedEventData' is defined but never used  @typescript-eslint/no-unused-vars
  10:43   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  11:32   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any
  13:45   error  Unexpected any. Specify a different type                @typescript-eslint/no-explicit-any

✖ 95 problems (95 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/components/useUserManagement.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useUserManagement.ts
  100:24  error  '_user' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/** ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useMCPServerManagement.ts
  165:33  error  '_serverId' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\useMcpToolFormatter.ts
  201:124  error  '_altPath' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\base-utils.ts
  161:129  error  '_altPath' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\create-file-format-result.ts
   5:103  error  'toolResult' is defined but never used     @typescript-eslint/no-unused-vars
  16:13   error  'path' is assigned a value but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useMessageHandlers.ts
  90:32  error  '_err' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useProviderHandlers.ts
  46:41  error  '_data' is defined but never used  @typescript-eslint/no-unused-vars

✖ 7 problems (7 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/** ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\auth\index.ts
  208:89  error  '_hash' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/services/** ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\services\TemplateGenerator.ts
  161:109  error  '_port' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/utils/** ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\utils\mention-blot.ts
  26:12  error  '_context' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/** ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useMCPServerManagement.ts
  165:33  error  '_serverId' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\useMcpToolFormatter.ts
  201:124  error  '_altPath' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\base-utils.ts
  161:129  error  '_altPath' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\mcp\utils\create-file-format-result.ts
   5:103  error  'toolResult' is defined but never used     @typescript-eslint/no-unused-vars
  16:13   error  'path' is assigned a value but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useMessageHandlers.ts
  90:32  error  '_err' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useProviderHandlers.ts
  46:41  error  '_data' is defined but never used  @typescript-eslint/no-unused-vars

✖ 7 problems (7 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/** ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useMessageHandlers.ts
  3:60  error  'ConnectErrorEvent' is defined but never used  @typescript-eslint/no-unused-vars

C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\utils\useProviderHandlers.ts
  4:84  error  'ProviderUpdateResultData' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/components/lab-sidecar/LabSidecar.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\components\lab-sidecar\LabSidecar.vue
  30:51  error  'toggle' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/composables/components/useMessagesView.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\composables\components\useMessagesView.ts
  2:10  error  'UIChatMessage' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/lab-domain-event.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\lab-domain-event.ts
  1:10  error  'z' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/schemas/lab-domain-event-schema.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\schemas\lab-domain-event-schema.ts
  2:10  error  'LabDomainEventEnvelopeV1' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/shared/types/schemas/lab-domain-event-schema.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\types\schemas\lab-domain-event-schema.ts
  2:10  error  'LabDomainEventEnvelopeV1' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== TYPE ERRORS FOR FILE: src/tests/shared/lab-domain-event.test.ts ===
src/tests/shared/lab-domain-event.test.ts(6,1): error TS2593: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha` and then add 'jest' or 'mocha' to the types field in your tsconfig.
src/tests/shared/lab-domain-event.test.ts(7,3): error TS2593: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha` and then add 'jest' or 'mocha' to the types field in your tsconfig.
src/tests/shared/lab-domain-event.test.ts(8,5): error TS2593: Cannot find name 'test'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha` and then add 'jest' or 'mocha' to the types field in your tsconfig.
src/tests/shared/lab-domain-event.test.ts(9,7): error TS2304: Cannot find name 'expect'.
src/tests/shared/lab-domain-event.test.ts(12,7): error TS2304: Cannot find name 'expect'.
src/tests/shared/lab-domain-event.test.ts(18,3): error TS2593: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha` and then add 'jest' or 'mocha' to the types field in your tsconfig.
src/tests/shared/lab-domain-event.test.ts(19,5): error TS2593: Cannot find name 'test'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha` and then add 'jest' or 'mocha' to the types field in your tsconfig.
src/tests/shared/lab-domain-event.test.ts(30,7): error TS2304: Cannot find name 'expect'.
src/tests/shared/lab-domain-event.test.ts(33,5): error TS2593: Cannot find name 'test'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha` and then add 'jest' or 'mocha' to the types field in your tsconfig.
src/tests/shared/lab-domain-event.test.ts(34,7): error TS2304: Cannot find name 'expect'.
src/tests/shared/lab-domain-event.test.ts(46,5): error TS2593: Cannot find name 'test'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha` and then add 'jest' or 'mocha' to the types field in your tsconfig.
src/tests/shared/lab-domain-event.test.ts(47,7): error TS2304: Cannot find name 'expect'.


=== LINT ERRORS FOR FILE: src/backend/db/LabEvents/lab-events-repository.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\LabEvents\lab-events-repository.ts
  60:11  error  'row' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== TYPE ERRORS FOR FILE: src/backend/routes/platform-lab-events-routes.ts ===
src/backend/routes/platform-lab-events-routes.ts(86,30): error TS18046: 'request.query' is of type 'unknown'.
src/backend/routes/platform-lab-events-routes.ts(127,21): error TS18046: 'request.query' is of type 'unknown'.


=== LINT ERRORS FOR FILE: src/shared/services/platform-lab-events.client.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\services\platform-lab-events.client.ts
  23:9  error  'body' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/lab-events/lab-events-notify.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\lab-events\lab-events-notify.ts
  10:10  error  'resolveUserId' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== TYPE ERRORS FOR FILE: src/dashboard/LabDashboard.vue ===
src/dashboard/LabDashboard.vue(281,17): error TS2365: Operator '>' cannot be applied to types 'Ref<number, number>' and 'number'.
src/dashboard/LabDashboard.vue(283,71): error TS2367: This comparison appears to be unintentional because the types 'Ref<number, number>' and 'number' have no overlap.
src/dashboard/LabDashboard.vue(284,13): error TS2365: Operator '>' cannot be applied to types 'Ref<number, number>' and 'number'.
src/dashboard/LabDashboard.vue(451,8): error TS2322: Type 'Ref<boolean, boolean>' is not assignable to type 'boolean'.
src/dashboard/LabDashboard.vue(452,8): error TS2322: Type 'Ref<boolean, boolean>' is not assignable to type 'boolean'.
src/dashboard/LabDashboard.vue(453,8): error TS2322: Type 'Ref<boolean, boolean>' is not assignable to type 'boolean'.
src/dashboard/LabDashboard.vue(454,8): error TS2322: Type 'Ref<boolean, boolean>' is not assignable to type 'boolean'.
src/dashboard/LabDashboard.vue(455,8): error TS2740: Type 'Ref<{ id: string; userId: number; eventId: string; title: string; body: string; readAt?: string | undefined; createdAt: string; }[], LabUserNotification[] | { id: string; userId: number; ... 4 more ...; createdAt: string; }[]>' is missing the following properties from type 'LabUserNotification[]': length, pop, push, concat, and 35 more.


=== TYPE ERRORS FOR FILE: src/backend/lab-integrations/lab-integrations-form-stub-provisioner.ts ===
src/backend/lab-integrations/lab-integrations-form-stub-provisioner.ts(47,5): error TS2322: Type 'string[]' is not assignable to type '("CRUD" | "Lookups" | "Search" | "Batch")[]'.
src/backend/lab-integrations/lab-integrations-form-stub-provisioner.ts(112,7): error TS2322: Type 'number' is not assignable to type 'boolean | undefined'.
src/backend/lab-integrations/lab-integrations-form-stub-provisioner.ts(135,5): error TS2322: Type 'number' is not assignable to type 'boolean | undefined'.


=== TYPE ERRORS FOR FILE: src/shared/forms/form-lookup-options.ts ===
src/shared/forms/form-lookup-options.ts(137,51): error TS2345: Argument of type 'IFormRuntimeField' is not assignable to parameter of type 'FormLookupFieldRef'.


=== TYPE ERRORS FOR FILE: src/apps/crm/front-end/components/CrmAppLayout.vue ===
src/apps/crm/front-end/components/CrmAppLayout.vue(179,46): error TS2345: Argument of type 'string | null' is not assignable to parameter of type 'string'.
src/apps/crm/front-end/components/CrmAppLayout.vue(180,51): error TS2345: Argument of type 'string | null' is not assignable to parameter of type 'string'.


=== TYPE ERRORS FOR FILE: src/backend/db/LabIntegrations/crm-integration-binding-seeds.ts ===
src/backend/db/LabIntegrations/crm-integration-binding-seeds.ts(161,9): error TS2345: Argument of type '{ hostAppId: string; serviceId: string; slot: string; overwrite: false; contract: FormsBuilderContract; chartName: string; }' is not assignable to parameter of type '{ hostAppId: string; serviceId: string; slot: string; publish: boolean; overwrite: boolean; suggestedFormKey?: string | undefined; suggestedChartKey?: string | undefined; chartType?: "bar" | ... 4 more ... | undefined; } & { ...; }'.


=== TYPE ERRORS FOR FILE: src/backend/lab-integrations/crm-entity-integration-sync-service.ts ===
src/backend/lab-integrations/crm-entity-integration-sync-service.ts(109,11): error TS2322: Type '{ entityKey: string; name: string; properties: { name: string; type: string; label: string; required?: boolean | undefined; options?: { value: string; label: string; }[] | undefined; lookupEntityKey?: string | undefined; lookupLabelProperty?: string | undefined; validation?: Record<...> | undefined; }[]; description...' is not assignable to type 'CrmManifestEntitySource[]'.


=== TYPE ERRORS FOR FILE: src/backend/routes/platform-integration-connector-routes.ts ===
src/backend/routes/platform-integration-connector-routes.ts(41,18): error TS2339: Property 'labUser' does not exist on type 'FastifyRequest<RouteGenericInterface, RawServerDefault, IncomingMessage, FastifySchema, FastifyTypeProviderDefault, unknown, FastifyBaseLogger, ResolveFastifyRequestType<...>>'.


=== TYPE ERRORS FOR FILE: src/apps/lab-rules-engine/front-end/App.vue ===
src/apps/lab-rules-engine/front-end/App.vue(48,8): error TS2345: Argument of type '{ header: string; }' is not assignable to parameter of type 'TabPanelProps & VNodeProps & AllowedComponentProps & ComponentCustomProps & Record<string, unknown>'.
src/apps/lab-rules-engine/front-end/App.vue(57,8): error TS2345: Argument of type '{ header: string; }' is not assignable to parameter of type 'TabPanelProps & VNodeProps & AllowedComponentProps & ComponentCustomProps & Record<string, unknown>'.


=== TYPE ERRORS FOR FILE: src/dashboard/components/settings/LabRuleDefinitionEditor.vue ===
src/dashboard/components/settings/LabRuleDefinitionEditor.vue(168,10): error TS2322: Type '(value: string) => void' is not assignable to type '(value: string | undefined) => void'.
src/dashboard/components/settings/LabRuleDefinitionEditor.vue(236,12): error TS2322: Type '(path: string) => void' is not assignable to type '(value: string | undefined) => void'.
src/dashboard/components/settings/LabRuleDefinitionEditor.vue(244,12): error TS2322: Type '(v: string) => void' is not assignable to type '(value: string | undefined) => void'.
src/dashboard/components/settings/LabRuleDefinitionEditor.vue(311,14): error TS2322: Type '(t: string) => void' is not assignable to type '(value: string | undefined) => void'.
src/dashboard/components/settings/LabRuleDefinitionEditor.vue(331,14): error TS2322: Type '(path: string) => void' is not assignable to type '(value: string | undefined) => void'.


=== TYPE ERRORS FOR FILE: src/dashboard/components/settings/LabRuleDefinitionEditor.vue ===
src/dashboard/components/settings/LabRuleDefinitionEditor.vue(228,12): error TS2322: Type 'string | number | boolean | null' is not assignable to type 'string | number | boolean | undefined'.
src/dashboard/components/settings/LabRuleDefinitionEditor.vue(229,12): error TS2322: Type '{ label: string | undefined; value: string; }[]' is not assignable to type 'LabUserOption[]'.


=== TYPE ERRORS FOR FILE: src/backend/db/Apps/apps-repository.ts ===
src/backend/db/Apps/apps-repository.ts(419,28): error TS2345: Argument of type 'string' is not assignable to parameter of type '"app-lab-formsbuilder" | "app-lab-chartbuilder"'.
src/backend/db/Apps/apps-repository.ts(420,21): error TS2345: Argument of type 'string' is not assignable to parameter of type '"app-lab-formsbuilder" | "app-lab-chartbuilder"'.


=== TYPE ERRORS FOR FILE: src/backend/db/Apps/apps-repository.ts ===
src/backend/db/Apps/apps-repository.ts(419,28): error TS2345: Argument of type 'string' is not assignable to parameter of type '"app-lab-formsbuilder" | "app-lab-chartbuilder"'.
src/backend/db/Apps/apps-repository.ts(420,21): error TS2345: Argument of type 'string' is not assignable to parameter of type '"app-lab-formsbuilder" | "app-lab-chartbuilder"'.


=== TYPE ERRORS FOR FILE: src/dashboard/components/settings/lab-workflows/LabWorkflowCanvasDnD.vue ===
src/dashboard/components/settings/lab-workflows/LabWorkflowCanvasDnD.vue(393,16): error TS2322: Type '{ dragId: string; step: { kind: "notify_users"; userIds: number[]; } | { kind: "notify_payload_user"; path: string; } | { kind: "publish_event"; type: string; sourceAppId: string; payloadMerge?: Record<...> | undefined; } | { ...; } | { ...; }; displayLabel: string; displayHint: string; }[]' is not assignable to type 'RuleEventDragBlock[]'.


=== TYPE ERRORS FOR FILE: src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue ===
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue(119,22): error TS2589: Type instantiation is excessively deep and possibly infinite.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue(485,10): error TS2322: Type '{ trigger: Raw<DefineComponent<__VLS_Props, {}, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {}, string, PublicProps, ... 9 more ..., any>>; condition: Raw<...>; rule: Raw<...>; action: Raw<...>; }' is not assignable to type 'NodeTypesObject'.


=== TYPE ERRORS FOR FILE: src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue ===
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue(52,3): error TS2322: Type 'DefineComponent<__VLS_Props, {}, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {}, string, PublicProps, ... 9 more ..., any>' is not assignable to type 'NodeComponent'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue(53,3): error TS2322: Type 'DefineComponent<__VLS_Props, {}, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {}, string, PublicProps, ... 9 more ..., any>' is not assignable to type 'NodeComponent'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue(54,3): error TS2322: Type 'DefineComponent<__VLS_Props, {}, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {}, string, PublicProps, ... 9 more ..., any>' is not assignable to type 'NodeComponent'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue(55,3): error TS2322: Type 'DefineComponent<__VLS_Props, {}, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {}, string, PublicProps, ... 9 more ..., any>' is not assignable to type 'NodeComponent'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue(120,43): error TS2589: Type instantiation is excessively deep and possibly infinite.


=== TYPE ERRORS FOR FILE: src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue ===
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue(128,43): error TS2589: Type instantiation is excessively deep and possibly infinite.


=== TYPE ERRORS FOR FILE: src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue ===
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue(210,3): error TS2589: Type instantiation is excessively deep and possibly infinite.


=== TYPE ERRORS FOR FILE: src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue ===
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue(254,21): error TS2589: Type instantiation is excessively deep and possibly infinite.


=== TYPE ERRORS FOR FILE: src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue ===
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue(255,21): error TS2589: Type instantiation is excessively deep and possibly infinite.


=== TYPE ERRORS FOR FILE: src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue ===
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue(270,21): error TS2589: Type instantiation is excessively deep and possibly infinite.


=== TYPE ERRORS FOR FILE: src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue ===
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue(290,21): error TS2589: Type instantiation is excessively deep and possibly infinite.


=== TYPE ERRORS FOR FILE: src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue ===
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue(127,22): error TS2589: Type instantiation is excessively deep and possibly infinite.


=== TYPE ERRORS FOR FILE: src/shared/types/lab-workflow-graph-flow.ts ===
src/shared/types/lab-workflow-graph-flow.ts(18,65): error TS2344: Type 'string' does not satisfy the constraint 'Record<string, CustomEvent>'.


=== TYPE ERRORS FOR FILE: src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue ===
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue(127,22): error TS2589: Type instantiation is excessively deep and possibly infinite.


=== TYPE ERRORS FOR FILE: src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue ===
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue(85,3): error TS2345: Argument of type '(nodes: LabWorkflowFlowNode[]) => Node<any, any, string>[]' is not assignable to parameter of type '(items: LabWorkflowFlowNode[] | LabWorkflowFlowEdge[]) => Node<any, any, string>[]'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue(90,3): error TS2345: Argument of type '(edges: LabWorkflowFlowEdge[]) => Edge[]' is not assignable to parameter of type '(items: LabWorkflowFlowNode[] | LabWorkflowFlowEdge[]) => Edge[]'.


=== TYPE ERRORS FOR FILE: src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue ===
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(48,54): error TS18047: 'props.selection' is possibly 'null'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(48,70): error TS2339: Property 'nodeId' does not exist on type '{ kind: "node"; nodeId: string; } | { kind: "edge"; edgeId: string; }'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(55,54): error TS18047: 'props.selection' is possibly 'null'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(55,70): error TS2339: Property 'edgeId' does not exist on type '{ kind: "node"; nodeId: string; } | { kind: "edge"; edgeId: string; }'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(126,5): error TS2322: Type '{ value?: string | undefined; kind: "lookup_field_equals" | "lookup_field_exists"; providerAppId: string; serviceId: string; recordIdPath: string; field: string; }' is not assignable to type 'LabRuleConditionV1'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(135,3): error TS2322: Type '{ value?: string | undefined; kind: "lookup_field_equals" | "lookup_field_exists"; providerAppId: string; serviceId: string; recordIdPath: string; field: string; }' is not assignable to type 'LabRuleConditionV1'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(177,10): error TS2554: Expected 3 arguments, but got 2.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(200,5): error TS2345: Argument of type '{ value: string | number | boolean | null; path: string; kind: "payload_equals"; } | { value?: string | number | boolean | null | undefined; path: string; kind: "payload_exists"; } | { value: string | ... 2 more ... | null; ... 5 more ...; field: string; } | { ...; }' is not assignable to parameter of type 'LabRuleConditionV1'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(303,25): error TS2345: Argument of type '{ kind: "trigger"; eventType: any; } | { kind: "trigger"; eventType: any; id: string; position: LabWorkflowGraphPosition; } | { kind: "trigger"; eventType: any; id: string; position: LabWorkflowGraphPosition; conditions: LabRuleConditionV1[]; } | { ...; } | { ...; }' is not assignable to parameter of type 'LabWorkflowGraphNodeV2'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(468,45): error TS2345: Argument of type '{ kind: "rule"; ruleId: any; } | { kind: "rule"; ruleId: any; id: string; position: LabWorkflowGraphPosition; eventType: string; } | { kind: "rule"; ruleId: any; id: string; position: LabWorkflowGraphPosition; conditions: LabRuleConditionV1[]; } | { ...; } | { ...; }' is not assignable to parameter of type 'LabWorkflowGraphNodeV2'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(482,45): error TS2345: Argument of type '{ kind: "action"; step: LabWorkflowStepV1; } | { kind: "action"; step: LabWorkflowStepV1; id: string; position: LabWorkflowGraphPosition; eventType: string; } | { ...; } | { ...; } | { ...; }' is not assignable to parameter of type 'LabWorkflowGraphNodeV2'.


=== TYPE ERRORS FOR FILE: src/dashboard/components/settings/lab-integrations/LabIntegrationLookupConditionFields.vue ===
src/dashboard/components/settings/lab-integrations/LabIntegrationLookupConditionFields.vue(56,28): error TS2345: Argument of type '{ kind: "lookup_field_equals"; providerAppId: string; serviceId: string; recordIdPath: string; field: string; value: string | number | boolean | null; } | { kind: "lookup_field_equals" | "lookup_field_exists"; ... 4 more ...; value: string | ... 2 more ... | null; } | { ...; } | { ...; }' is not assignable to parameter of type '{ kind: "lookup_field_equals"; providerAppId: string; serviceId: string; recordIdPath: string; field: string; value: string | number | boolean | null; } | { kind: "lookup_field_exists"; providerAppId: string; serviceId: string; recordIdPath: string; field: string; }'.


=== TYPE ERRORS FOR FILE: src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue ===
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue(323,31): error TS2345: Argument of type 'Node<any, any, string>[]' is not assignable to parameter of type 'GraphNode<any, any, string>[]'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue(332,31): error TS2345: Argument of type 'Edge[]' is not assignable to parameter of type 'GraphEdge[]'.


=== TYPE ERRORS FOR FILE: src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue ===
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue(324,42): error TS2345: Argument of type 'Node<any, any, string>[]' is not assignable to parameter of type 'GraphNode<any, any, string>[]'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue(332,42): error TS2345: Argument of type 'Edge[]' is not assignable to parameter of type 'GraphEdge[]'.


=== TYPE ERRORS FOR FILE: src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue ===
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(61,54): error TS18047: 'props.selection' is possibly 'null'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(61,70): error TS2339: Property 'nodeId' does not exist on type '{ kind: "node"; nodeId: string; } | { kind: "edge"; edgeId: string; }'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(68,54): error TS18047: 'props.selection' is possibly 'null'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(68,70): error TS2339: Property 'edgeId' does not exist on type '{ kind: "node"; nodeId: string; } | { kind: "edge"; edgeId: string; }'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(130,10): error TS2554: Expected 3 arguments, but got 2.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(311,25): error TS2345: Argument of type '{ kind: "trigger"; eventType: any; } | { kind: "trigger"; eventType: any; id: string; position: LabWorkflowGraphPosition; } | { kind: "trigger"; eventType: any; id: string; position: LabWorkflowGraphPosition; conditions: LabRuleConditionV1[]; } | { ...; } | { ...; }' is not assignable to parameter of type 'LabWorkflowGraphNodeV2'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(449,25): error TS2345: Argument of type '{ kind: "rule"; ruleId: any; } | { kind: "rule"; ruleId: any; id: string; position: LabWorkflowGraphPosition; eventType: string; } | { kind: "rule"; ruleId: any; id: string; position: LabWorkflowGraphPosition; conditions: LabRuleConditionV1[]; } | { ...; } | { ...; }' is not assignable to parameter of type 'LabWorkflowGraphNodeV2'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(466,25): error TS2345: Argument of type '{ kind: "rule"; ruleId: string; } | { kind: "rule"; ruleId: string; id: string; position: LabWorkflowGraphPosition; eventType: string; } | { kind: "rule"; ruleId: string; id: string; position: LabWorkflowGraphPosition; conditions: LabRuleConditionV1[]; } | { ...; } | { ...; }' is not assignable to parameter of type 'LabWorkflowGraphNodeV2'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(481,45): error TS2345: Argument of type '{ kind: "action"; step: LabWorkflowStepV1; } | { kind: "action"; step: LabWorkflowStepV1; id: string; position: LabWorkflowGraphPosition; eventType: string; } | { ...; } | { ...; } | { ...; }' is not assignable to parameter of type 'LabWorkflowGraphNodeV2'.


=== TYPE ERRORS FOR FILE: src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue ===
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(66,54): error TS18047: 'props.selection' is possibly 'null'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(66,70): error TS2339: Property 'nodeId' does not exist on type '{ kind: "node"; nodeId: string; } | { kind: "edge"; edgeId: string; }'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(73,54): error TS18047: 'props.selection' is possibly 'null'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(73,70): error TS2339: Property 'edgeId' does not exist on type '{ kind: "node"; nodeId: string; } | { kind: "edge"; edgeId: string; }'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(135,10): error TS2554: Expected 3 arguments, but got 2.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(386,29): error TS2345: Argument of type '{ kind: "trigger"; eventType: any; } | { kind: "trigger"; eventType: any; id: string; position: LabWorkflowGraphPosition; } | { kind: "trigger"; eventType: any; id: string; position: LabWorkflowGraphPosition; conditions: LabRuleConditionV1[]; } | { ...; } | { ...; } | { ...; }' is not assignable to parameter of type 'LabWorkflowGraphNodeV2'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(564,25): error TS2345: Argument of type '{ kind: "rule"; ruleId: any; } | { kind: "rule"; ruleId: any; id: string; position: LabWorkflowGraphPosition; eventType: string; } | { kind: "rule"; ruleId: any; id: string; position: LabWorkflowGraphPosition; conditions: LabRuleConditionV1[]; } | { ...; } | { ...; } | { ...; }' is not assignable to parameter of type 'LabWorkflowGraphNodeV2'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(581,25): error TS2345: Argument of type '{ kind: "rule"; ruleId: string; } | { kind: "rule"; ruleId: string; id: string; position: LabWorkflowGraphPosition; eventType: string; } | { kind: "rule"; ruleId: string; id: string; position: LabWorkflowGraphPosition; conditions: LabRuleConditionV1[]; } | { ...; } | { ...; } | { ...; }' is not assignable to parameter of type 'LabWorkflowGraphNodeV2'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(618,29): error TS2345: Argument of type '{ kind: "group"; label: string; } | { kind: "group"; label: string; id: string; position: LabWorkflowGraphPosition; eventType: string; } | { kind: "group"; label: string; id: string; position: LabWorkflowGraphPosition; conditions: LabRuleConditionV1[]; } | { ...; } | { ...; } | { ...; }' is not assignable to parameter of type 'LabWorkflowGraphNodeV2'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(663,29): error TS2345: Argument of type '{ kind: "action"; groupId: any; } | { kind: "action"; groupId: any; id: string; position: LabWorkflowGraphPosition; eventType: string; } | { kind: "action"; groupId: any; id: string; position: LabWorkflowGraphPosition; conditions: LabRuleConditionV1[]; } | { ...; } | { ...; } | { ...; }' is not assignable to parameter of type 'LabWorkflowGraphNodeV2'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(688,49): error TS2345: Argument of type '{ kind: "action"; step: LabWorkflowStepV1; } | { kind: "action"; step: LabWorkflowStepV1; id: string; position: LabWorkflowGraphPosition; eventType: string; } | { ...; } | { ...; } | { ...; } | { ...; }' is not assignable to parameter of type 'LabWorkflowGraphNodeV2'.


=== TYPE ERRORS FOR FILE: src/backend/routes/platform-integration-connector-routes.ts ===
src/backend/routes/platform-integration-connector-routes.ts(434,89): error TS2339: Property 'io' does not exist on type 'FastifyInstance<RawServerDefault, IncomingMessage, ServerResponse<IncomingMessage>, FastifyBaseLogger, FastifyTypeProviderDefault>'.
src/backend/routes/platform-integration-connector-routes.ts(455,86): error TS2339: Property 'io' does not exist on type 'FastifyInstance<RawServerDefault, IncomingMessage, ServerResponse<IncomingMessage>, FastifyBaseLogger, FastifyTypeProviderDefault>'.
src/backend/routes/platform-integration-connector-routes.ts(587,87): error TS2339: Property 'io' does not exist on type 'FastifyInstance<RawServerDefault, IncomingMessage, ServerResponse<IncomingMessage>, FastifyBaseLogger, FastifyTypeProviderDefault>'.


=== TYPE ERRORS FOR FILE: src/dashboard/components/settings/LabApprovalsInbox.vue ===
src/dashboard/components/settings/LabApprovalsInbox.vue(113,8): error TS2345: Argument of type '{ header: string; }' is not assignable to parameter of type 'TabPanelProps & VNodeProps & AllowedComponentProps & ComponentCustomProps & Record<string, unknown>'.
src/dashboard/components/settings/LabApprovalsInbox.vue(135,8): error TS2345: Argument of type '{ header: string; }' is not assignable to parameter of type 'TabPanelProps & VNodeProps & AllowedComponentProps & ComponentCustomProps & Record<string, unknown>'.


=== TYPE ERRORS FOR FILE: src/backend/db/LabIntegrations/platform-phase2-binding-seeds.ts ===
src/backend/db/LabIntegrations/platform-phase2-binding-seeds.ts(191,7): error TS2345: Argument of type '{ hostAppId: string; serviceId: string; slot: string; suggestedChartKey: string; overwrite: boolean; contract: FormsBuilderContract; chartName: string; chartType: "bar"; }' is not assignable to parameter of type '{ hostAppId: string; serviceId: string; slot: string; publish: boolean; overwrite: boolean; suggestedFormKey?: string | undefined; suggestedChartKey?: string | undefined; chartType?: "bar" | ... 4 more ... | undefined; } & { ...; }'.


=== TYPE ERRORS FOR FILE: src/backend/utils/chat/base-utils.ts ===
src/backend/utils/chat/base-utils.ts(430,67): error TS2554: Expected 1 arguments, but got 2.


=== TYPE ERRORS FOR FILE: src/backend/utils/chat/stream-chat-manager.ts ===
src/backend/utils/chat/stream-chat-manager.ts(135,78): error TS2554: Expected 1 arguments, but got 2.


=== LINT ERRORS FOR FILE: src/apps/word-tile/front-end/App.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\word-tile\front-end\App.vue
  247:9  error  'meta' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== TYPE ERRORS FOR FILE: src/shared/game-platform/match-service.ts ===
src/shared/game-platform/match-service.ts(102,26): error TS2304: Cannot find name 'MatchCreateConfig'.
src/shared/game-platform/match-service.ts(145,26): error TS2304: Cannot find name 'MatchCreateConfig'.


=== TYPE ERRORS FOR FILE: src/apps/okr-goals/back-end/server.ts ===
src/apps/okr-goals/back-end/server.ts(171,47): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'Record<string, unknown>'.


=== TYPE ERRORS FOR FILE: src/apps/travel-itinerary/back-end/server.ts ===
src/apps/travel-itinerary/back-end/server.ts(123,42): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'Record<string, unknown>'.


=== TYPE ERRORS FOR FILE: src/apps/rental-property/back-end/server.ts ===
src/apps/rental-property/back-end/server.ts(149,43): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'Record<string, unknown>'.


=== LINT ERRORS FOR FILE: src\apps\okr-goals\back-end\server.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\okr-goals\back-end\server.ts
  148:42  error  'keyResults' is defined but never used           @typescript-eslint/no-unused-vars
  148:54  error  'progress' is defined but never used             @typescript-eslint/no-unused-vars
  152:21  error  'keyResults' is assigned a value but never used  @typescript-eslint/no-unused-vars
  152:33  error  'progress' is assigned a value but never used    @typescript-eslint/no-unused-vars

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src\apps\onboarding-checklist\back-end\server.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\onboarding-checklist\back-end\server.ts
  93:42  error  'tasks' is defined but never used           @typescript-eslint/no-unused-vars
  97:21  error  'tasks' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/apps/weather-dashboard/back-end/server.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\weather-dashboard\back-end\server.ts
   96:51  error  'latest' is defined but never used           @typescript-eslint/no-unused-vars
  100:21  error  'latest' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/tests/shared/game-platform-agent-loop.test.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\tests\shared\game-platform-agent-loop.test.ts
  206:26  error  '_config' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/apps/word-tile/back-end/rules.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\word-tile\back-end\rules.ts
  1040:10  error  'moveTypeFromToolArguments' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/apps/tic-tac-toe/back-end/agent.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\tic-tac-toe\back-end\agent.ts
   10:3  error  'WIN_LINES' is defined but never used  @typescript-eslint/no-unused-vars
  152:3  error  'seat' is defined but never used       @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/apps/tic-tac-toe/back-end/agent.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\tic-tac-toe\back-end\agent.ts
  147:3  error  '_seat' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== TYPE ERRORS FOR FILE: src/apps/checkers/front-end/App.vue ===
src/apps/checkers/front-end/App.vue(27,29): error TS2614: Module '"./games/Checkers/CheckersGame.vue"' has no exported member 'BoardPiece'. Did you mean to use 'import BoardPiece from "./games/Checkers/CheckersGame.vue"' instead?


=== TYPE ERRORS FOR FILE: src/scripts/register-catalog-apps-once.ts ===
src/scripts/register-catalog-apps-once.ts(249,5): error TS2554: Expected 2 arguments, but got 1.


=== TYPE ERRORS FOR FILE: src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue ===
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(337,39): error TS2322: Type '{ kind: "set_fields" | "if_condition"; fields?: { path: string; source: "literal" | "from_payload" | "template"; value: string | number | boolean | null; }[] | undefined; conditions: LabRuleConditionV1[]; combine?: "all" | ... 1 more ... | undefined; } | ... 20 more ... | { ...; }' is not assignable to type 'LabWorkflowStepV1 | undefined'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(589,42): error TS2339: Property 'formInputTextPt' does not exist on type '{ generateUniqueId: (prefix?: string) => string; selectedNode: LabWorkflowGraphNodeV2 | null; selectedNodeHeaderTitle: string; selectedNodeHeaderLead: string; ... 68 more ...; $primevue: { ...; }; }'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(706,42): error TS2339: Property 'groupId' does not exist on type '({ id: string; kind: "action"; position: LabWorkflowGraphPosition; groupId?: string | undefined; step: LabWorkflowStepV1; } & LabWorkflowNodeExecutionPolicy) | { ...; }'.
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(859,40): error TS2339: Property 'formInputTextPt' does not exist on type '{ generateUniqueId: (prefix?: string) => string; selectedNode: LabWorkflowGraphNodeV2 | null; selectedNodeHeaderTitle: string; selectedNodeHeaderLead: string; ... 68 more ...; $primevue: { ...; }; }'.


=== TYPE ERRORS FOR FILE: src/dashboard/components/settings/lab-workflows/LabWorkflowFlowStepEditor.vue ===
src/dashboard/components/settings/lab-workflows/LabWorkflowFlowStepEditor.vue(820,76): error TS2345: Argument of type '{ conditions: LabRuleConditionV1[]; kind: "set_fields"; fields: { path: string; source: "literal" | "from_payload" | "template"; value: string | number | boolean | null; }[]; } | ... 20 more ... | { ...; }' is not assignable to parameter of type 'LabWorkflowStepV1'.
src/dashboard/components/settings/lab-workflows/LabWorkflowFlowStepEditor.vue(821,70): error TS2345: Argument of type '{ combine: "all" | "any"; kind: "set_fields"; fields: { path: string; source: "literal" | "from_payload" | "template"; value: string | number | boolean | null; }[]; } | { combine: "all" | "any"; kind: "rename_fields"; renames?: { ...; }[] | undefined; remove?: string[] | undefined; } | ... 19 more ... | { ...; }' is not assignable to parameter of type 'LabWorkflowStepV1'.


=== TYPE ERRORS FOR FILE: src/dashboard/components/settings/lab-workflows/LabWorkflowGraphRuleSetupPanel.vue ===
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphRuleSetupPanel.vue(94,53): error TS2551: Property 'value' does not exist on type '({ kind: "payload_equals"; path: string; value: string | number | boolean | null; } | { kind: "payload_exists"; path: string; } | { kind: "lookup_field_equals"; providerAppId: string; serviceId: string; recordIdPath: string; field: string; value: string | ... 2 more ... | null; } | { ...; })[]'. Did you mean 'values'?


=== LINT ERRORS FOR FILE: src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\settings\lab-workflows\LabWorkflowGraphCanvas.vue
  58:3  error  'LabWorkflowFlowNodeData' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/components/settings/LabWorkflowDefinitionEditor.vue ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\settings\LabWorkflowDefinitionEditor.vue
  105:10  error  'sampleValueForKind' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== TYPE ERRORS FOR FILE: src/backend/lab-workflows/lab-workflow-graph-evaluator.ts ===
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(184,17): error TS2304: Cannot find name 'workflow'.


=== TYPE ERRORS FOR FILE: src/dashboard/components/settings/LabWorkflowDefinitionEditor.vue ===
src/dashboard/components/settings/LabWorkflowDefinitionEditor.vue(129,5): error TS2345: Argument of type '{ nodeId: string; }[]' is not assignable to parameter of type 'LabWorkflowManualRunStep[]'.
src/dashboard/components/settings/LabWorkflowDefinitionEditor.vue(244,17): error TS2304: Cannot find name 'stopPlayback'.


=== LINT ERRORS FOR FILE: src/dashboard/components/settings/LabWorkflowDefinitionEditor.vue ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\settings\LabWorkflowDefinitionEditor.vue
   14:10  error  'labWorkflowRunNodeStatusMap' is defined but never used  @typescript-eslint/no-unused-vars
  108:5   error  'pacingPreview' is assigned a value but never used       @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/components/settings/LabWorkflowDefinitionEditor.vue ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\settings\LabWorkflowDefinitionEditor.vue
   14:10  error  'labWorkflowRunNodeStatusMap' is defined but never used  @typescript-eslint/no-unused-vars
  102:5   error  'runHttpPending' is assigned a value but never used      @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== TYPE ERRORS FOR FILE: src/dashboard/components/settings/LabWorkflowDefinitionEditor.vue ===
src/dashboard/components/settings/LabWorkflowDefinitionEditor.vue(193,3): error TS2304: Cannot find name 'runHttpPending'.


=== TYPE ERRORS FOR FILE: src/backend/lab-workflows/lab-workflow-step-runner.ts ===
src/backend/lab-workflows/lab-workflow-step-runner.ts(209,47): error TS2345: Argument of type '{ path: string; source: "literal" | "from_payload" | "template" | "increment"; value: string | number | boolean | null; by?: number | undefined; }[]' is not assignable to parameter of type 'readonly LabWorkflowFieldAssignment[]'.
src/backend/lab-workflows/lab-workflow-step-runner.ts(307,31): error TS2339: Property 'loopIteration' does not exist on type 'EvaluateWorkflowsOptions'.
src/backend/lab-workflows/lab-workflow-step-runner.ts(336,9): error TS2322: Type '"body" | "done"' is not assignable to type 'number | "true" | "false" | undefined'.


=== TYPE ERRORS FOR FILE: src/shared/utils/lab-workflow-item-transforms.ts ===
src/shared/utils/lab-workflow-item-transforms.ts(93,7): error TS2367: This comparison appears to be unintentional because the types '"literal"' and '"increment"' have no overlap.
src/shared/utils/lab-workflow-item-transforms.ts(99,34): error TS2339: Property 'by' does not exist on type 'LabWorkflowFieldAssignment'.
src/shared/utils/lab-workflow-item-transforms.ts(99,80): error TS2339: Property 'by' does not exist on type 'LabWorkflowFieldAssignment'.
src/shared/utils/lab-workflow-item-transforms.ts(99,97): error TS2339: Property 'by' does not exist on type 'LabWorkflowFieldAssignment'.


=== TYPE ERRORS FOR FILE: src/backend/lab-workflows/lab-workflow-graph-evaluator.ts ===
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(412,28): error TS2345: Argument of type '{ id: string; kind: "action"; position: LabWorkflowGraphPosition; groupId?: string | undefined; step: LabWorkflowStepV1; } & LabWorkflowNodeExecutionPolicy' is not assignable to parameter of type '{ id: string; kind: "action"; position: LabWorkflowGraphPosition; groupId?: string | undefined; step: LabWorkflowStepV1; } & LabWorkflowNodeExecutionPolicy & { ...; }'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(447,77): error TS2304: Cannot find name 'LabRuleConditionV1'.


=== TYPE ERRORS FOR FILE: src/backend/lab-workflows/lab-workflow-graph-evaluator.ts ===
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(452,51): error TS2339: Property 'id' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(453,51): error TS2339: Property 'id' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(461,20): error TS2339: Property 'id' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(462,22): error TS2339: Property 'kind' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(467,79): error TS2339: Property 'step' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(470,65): error TS2339: Property 'id' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(475,27): error TS2339: Property 'step' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(478,26): error TS2339: Property 'id' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(478,35): error TS2339: Property 'kind' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(483,18): error TS2339: Property 'step' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(487,20): error TS2339: Property 'id' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(493,28): error TS2339: Property 'id' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(493,37): error TS2339: Property 'kind' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(495,22): error TS2339: Property 'id' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(496,24): error TS2339: Property 'kind' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(501,68): error TS2339: Property 'step' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(513,36): error TS2339: Property 'step' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(516,26): error TS2339: Property 'id' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(516,35): error TS2339: Property 'kind' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(518,20): error TS2339: Property 'id' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(519,22): error TS2339: Property 'kind' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(529,29): error TS2339: Property 'step' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(541,38): error TS2339: Property 'id' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(545,63): error TS2339: Property 'id' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(554,70): error TS2339: Property 'id' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(562,72): error TS2339: Property 'step' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(563,32): error TS2339: Property 'id' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(566,18): error TS2339: Property 'id' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(567,20): error TS2339: Property 'kind' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(575,27): error TS2339: Property 'step' does not exist on type 'never'.
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(581,60): error TS2339: Property 'id' does not exist on type 'never'.


=== TYPE ERRORS FOR FILE: src/backend/lab-workflows/lab-workflow-graph-evaluator.ts ===
src/backend/lab-workflows/lab-workflow-graph-evaluator.ts(447,56): error TS2304: Cannot find name 'LabRuleConditionV1'.


=== TYPE ERRORS FOR FILE: src/shared/utils/lab-workflow-definition-canvas.ts ===
src/shared/utils/lab-workflow-definition-canvas.ts(420,5): error TS2322: Type '"loop"' is not assignable to type 'WorkflowActionPaletteKind'.
src/shared/utils/lab-workflow-definition-canvas.ts(527,10): error TS2678: Type '"loop"' is not comparable to type 'WorkflowActionPaletteKind'.


=== LINT ERRORS FOR FILE: src/backend/lab-workflows/lab-workflow-step-runner.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\lab-workflows\lab-workflow-step-runner.ts
  192:3  error  'loopIteration' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== TYPE ERRORS FOR FILE: src/backend/db/LabWorkflows/lab-workflows-schema.ts ===
src/backend/db/LabWorkflows/lab-workflows-schema.ts(613,9): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(616,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(616,14): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(616,19): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(617,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(617,15): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(617,16): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(617,18): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(617,19): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(617,21): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(617,22): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(617,24): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(617,25): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(617,27): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(618,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(618,10): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(618,27): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(618,30): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(618,37): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(619,9): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(625,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(625,14): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(626,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(626,12): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(627,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(627,13): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(627,22): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(629,51): error TS1005: ':' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(629,62): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(629,65): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(630,21): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(632,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(632,14): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(633,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(633,12): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(634,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(634,13): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(634,24): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(634,27): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(635,9): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(635,13): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(635,26): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(636,13): error TS1005: ':' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(636,16): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(636,26): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(637,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(639,43): error TS1005: ':' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(642,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(642,14): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(643,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(643,11): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(643,24): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(644,13): error TS1005: ':' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(644,22): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(644,28): error TS1005: ':' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(644,39): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(644,42): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(647,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(647,14): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(647,19): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(647,44): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(647,50): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(647,59): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(650,7): error TS1005: ':' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(650,14): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(652,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(652,12): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(653,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(653,13): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(653,26): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(653,32): error TS1005: ':' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(656,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(656,14): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(658,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(658,12): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(659,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(659,13): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(659,27): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(660,13): error TS1005: ':' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(660,16): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(660,27): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(660,38): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(663,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(663,14): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(665,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(665,12): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(666,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(666,13): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(666,18): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(666,24): error TS1005: ':' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(666,38): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(669,7): error TS1005: ':' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(669,14): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(669,19): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(672,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(672,15): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(672,16): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(672,18): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(672,19): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(672,21): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(672,22): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(672,24): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(672,25): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(672,27): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(672,28): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(672,30): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(672,31): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(672,33): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(672,34): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(672,36): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(675,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(675,14): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(676,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(676,11): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(676,18): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(676,19): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(676,34): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(676,35): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(676,51): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(676,52): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(676,64): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(676,65): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(677,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(677,13): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(677,18): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(677,24): error TS1005: ':' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(677,38): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(679,9): error TS1005: ':' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(682,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(682,14): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(683,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(683,11): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(683,30): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(683,31): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(683,52): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(684,13): error TS1005: ':' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(684,18): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(687,7): error TS1005: ':' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(687,14): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(687,19): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(687,41): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(687,47): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(687,52): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(687,58): error TS1005: ':' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(687,72): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(690,7): error TS1005: ':' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(690,14): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(690,20): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(690,21): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(690,23): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(690,26): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(690,28): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(690,33): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(690,55): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(690,61): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(690,75): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(693,7): error TS1005: ':' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(693,14): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(694,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(694,12): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(695,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(695,13): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(695,31): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(695,37): error TS1005: ':' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(695,49): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(697,69): error TS1005: ':' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(697,72): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(701,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(701,14): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(701,19): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(704,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(704,15): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(704,16): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(704,18): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(704,19): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(704,21): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(704,22): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(704,24): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(704,25): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(705,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(705,10): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(705,47): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(705,50): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(705,57): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(706,9): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(711,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(711,14): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(712,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(712,12): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(713,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(713,13): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(713,31): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(716,7): error TS1005: ':' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(716,14): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(716,19): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(719,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(719,15): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(719,16): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(719,18): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(719,19): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(719,21): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(719,22): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(719,24): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(719,25): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(719,27): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(720,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(720,10): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(720,36): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(720,39): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(720,46): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(721,9): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(727,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(727,14): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(727,19): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(727,48): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(727,54): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(727,72): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(730,7): error TS1005: ':' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(730,14): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(732,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(732,12): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(733,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(733,13): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(733,27): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(734,13): error TS1005: ':' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(734,16): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(734,24): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(735,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(738,7): error TS1005: ':' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(738,14): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(740,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(740,12): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(741,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(741,13): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(741,18): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(741,24): error TS1005: ':' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(741,38): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(743,9): error TS1005: ':' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(744,57): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(747,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(747,14): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(747,44): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(747,47): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(747,52): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(747,57): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(747,79): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(747,85): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(747,99): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(750,7): error TS1005: ':' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(750,14): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(750,19): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(753,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(753,15): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(753,16): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(753,18): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(753,19): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(753,21): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(753,22): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(753,24): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(753,25): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(753,27): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(753,28): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(753,30): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(753,31): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(753,33): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(753,34): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(753,36): error TS1135: Argument expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(755,28): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(755,36): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(758,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(758,14): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(758,19): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(759,7): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(759,13): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(759,27): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(760,13): error TS1005: ':' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(760,16): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(760,20): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(761,18): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(761,21): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(761,26): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(762,11): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(762,17): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(762,31): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(763,17): error TS1005: ':' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(763,20): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(763,28): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(764,11): error TS1005: ',' expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(765,9): error TS1109: Expression expected.
src/backend/db/LabWorkflows/lab-workflows-schema.ts(769,1): error TS1160: Unterminated template literal.


=== TYPE ERRORS FOR FILE: src/backend/lab-workflows/lab-workflow-resume-service.ts ===
src/backend/lab-workflows/lab-workflow-resume-service.ts(14,30): error TS2307: Cannot find module '../utils/VSCodeLogger' or its corresponding type declarations.
src/backend/lab-workflows/lab-workflow-resume-service.ts(47,41): error TS2345: Argument of type '{ runId: string; status: "failed"; error: string; }' is not assignable to parameter of type 'FinishRunParams'.
src/backend/lab-workflows/lab-workflow-resume-service.ts(90,25): error TS2339: Property 'envelope' does not exist on type 'LabWorkflowRun'.
src/backend/lab-workflows/lab-workflow-resume-service.ts(129,41): error TS2345: Argument of type '{ runId: string; status: "failed"; error: string; }' is not assignable to parameter of type 'FinishRunParams'.


=== TYPE ERRORS FOR FILE: src/backend/db/LabWorkflows/lab-workflows-service.ts ===
src/backend/db/LabWorkflows/lab-workflows-service.ts(724,18): error TS2304: Cannot find name 'persistRunSuspension'.


=== TYPE ERRORS FOR FILE: src/backend/db/LabWorkflows/lab-workflows-schema.ts ===
src/backend/db/LabWorkflows/lab-workflows-schema.ts(476,3): error TS2741: Property 'webhook_by_token_hash' is missing in type '{ workflows_all: BetterSqlite3.Statement<unknown[], unknown>; workflow_by_id: BetterSqlite3.Statement<unknown[], unknown>; count_enabled_global: BetterSqlite3.Statement<unknown[], unknown>; ... 58 more ...; version_prune_oldest: BetterSqlite3.Statement<...>; }' but required in type 'Record<"workflows_all" | "workflow_by_id" | "count_enabled_global" | "count_enabled_for_owner" | "workflow_insert" | "workflow_update" | "workflow_delete" | "enabled_workflows_for_evaluation" | ... 54 more ... | "version_prune_oldest", Statement<...> | Statement<...>>'.


=== TYPE ERRORS FOR FILE: src/backend/db/LabWorkflows/lab-workflows-schema.ts ===
src/backend/db/LabWorkflows/lab-workflows-schema.ts(451,3): error TS1117: An object literal cannot have multiple properties with the same name.


=== TYPE ERRORS FOR FILE: src/backend/routes/workflow-webhook-trigger-routes.ts ===
src/backend/routes/workflow-webhook-trigger-routes.ts(193,26): error TS2339: Property 'io' does not exist on type 'FastifyInstance<RawServerDefault, IncomingMessage, ServerResponse<IncomingMessage>, FastifyBaseLogger, FastifyTypeProviderDefault>'.


=== TYPE ERRORS FOR FILE: src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue ===
src/dashboard/components/settings/lab-workflows/LabWorkflowGraphDetailPanel.vue(464,29): error TS2339: Property 'workflowId' does not exist on type '{ generateUniqueId: (prefix?: string) => string; selectedNode: LabWorkflowGraphNodeV2 | null; selectedNodeHeaderTitle: string; selectedNodeHeaderLead: string; ... 69 more ...; $primevue: { ...; }; }'.


=== LINT ERRORS FOR FILE: tmp-lint-probe.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\tmp-lint-probe.ts
  1:7  error  'unused' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: tmp-lint-probe.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\tmp-lint-probe.ts
  1:7  error  'unused' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/assets/styles/lab-app-shell.css ===

c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\assets\styles\lab-app-shell.css
  0:0  warning  File ignored because no matching configuration was supplied

✖ 1 problem (0 errors, 1 warning)




=== LINT ERRORS FOR FILE: src/assets/styles/lab-app-shell.css ===

c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\assets\styles\lab-app-shell.css
  0:0  warning  File ignored because no matching configuration was supplied

✖ 1 problem (0 errors, 1 warning)




=== LINT ERRORS FOR FILE: src/assets/styles/lab-app-shell.css ===

c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\assets\styles\lab-app-shell.css
  0:0  warning  File ignored because no matching configuration was supplied

✖ 1 problem (0 errors, 1 warning)




=== LINT ERRORS FOR FILE: src/dashboard/components/settings/lab-workflows/LabWorkflowCodeNodeEditor.vue ===

c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\settings\lab-workflows\LabWorkflowCodeNodeEditor.vue
  58:5  warning  Unused eslint-disable directive (no problems were reported from 'no-new-func')

✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.




=== LINT ERRORS FOR FILE: src/shared/utils/demo-workflow-definition-webhook-loop.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\utils\demo-workflow-definition-webhook-loop.ts
  1:15  error  'LabWorkflowDefinitionV2' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/db/PlatformCatalog/platform-catalog-demo-seed.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\db\PlatformCatalog\platform-catalog-demo-seed.ts
   1:10  error  'randomUUID' is defined but never used                    @typescript-eslint/no-unused-vars
  25:10  error  'DEMO_WEBHOOK_LOOP_EVENT_TYPE' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/components/settings/lab-workflows/LabWorkflowCodeEditor.vue ===

c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\settings\lab-workflows\LabWorkflowCodeEditor.vue
  95:5  warning  Unused eslint-disable directive (no problems were reported from 'no-new-func')

✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.




=== LINT ERRORS FOR FILE: src/dashboard/components/settings/lab-workflows/LabWorkflowCodeEditor.vue ===

c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\settings\lab-workflows\LabWorkflowCodeEditor.vue
  95:5  warning  Unused eslint-disable directive (no problems were reported from 'no-new-func')

✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.




=== LINT ERRORS FOR FILE: src/shared/utils/lab-workflow-graph-edge.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\shared\utils\lab-workflow-graph-edge.ts
  177:26  error  '_dropped' is assigned a value but never used  @typescript-eslint/no-unused-vars
  191:28  error  '_dropped' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/backend/lab-rules/lab-rules-match.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\backend\lab-rules\lab-rules-match.ts
  157:10  error  'isPayloadValueMissing' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\settings\lab-workflows\LabWorkflowGraphCanvas.vue
  75:3  error  'DEFAULT_GROUP_HEIGHT' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/components/settings/lab-workflows/LabWorkflowGraphGroupNode.vue ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\settings\lab-workflows\LabWorkflowGraphGroupNode.vue
  105:7  error  'hint' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\dashboard\components\settings\lab-workflows\LabWorkflowGraphCanvas.vue
  128:3  error  'labWorkflowGroupHeight' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== TYPE ERRORS FOR FILE: src/backend/db/Auth/auth-schema.ts ===
src/backend/db/Auth/auth-schema.ts(26,47): error TS2304: Cannot find name 'Database'.


=== TYPE ERRORS FOR FILE: src/backend/db/LabIntegrations/crm-integration-binding-seeds.ts ===
src/backend/db/LabIntegrations/crm-integration-binding-seeds.ts(525,30): error TS2304: Cannot find name 'catalogFormKey'.


=== TYPE ERRORS FOR FILE: src/apps/lab-chartbuilder/back-end/server.ts ===
src/apps/lab-chartbuilder/back-end/server.ts(116,38): error TS2345: Argument of type 'ConnectorRouteId' is not assignable to parameter of type 'number'.
src/apps/lab-chartbuilder/back-end/server.ts(123,45): error TS2345: Argument of type 'ConnectorRouteId' is not assignable to parameter of type 'number'.


=== LINT ERRORS FOR FILE: src/apps/lab-chartbuilder/front-end/views/ChartConnectorsView.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\lab-chartbuilder\front-end\views\ChartConnectorsView.vue
  132:11  error  'fields' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== TYPE ERRORS FOR FILE: src/apps/time-tracking/back-end/server.ts ===
src/apps/time-tracking/back-end/server.ts(125,39): error TS2345: Argument of type 'ConnectorRouteId' is not assignable to parameter of type 'number'.
src/apps/time-tracking/back-end/server.ts(147,54): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'TimesheetWeek'.


=== TYPE ERRORS FOR FILE: src/apps/time-tracking/front-end/App.vue ===
src/apps/time-tracking/front-end/App.vue(421,41): error TS7006: Parameter 'v' implicitly has an 'any' type.


=== TYPE ERRORS FOR FILE: src/apps/checkers/front-end/App.vue ===
src/apps/checkers/front-end/App.vue(373,16): error TS2740: Type 'ComputedRef<PlayerTurn[]>' is missing the following properties from type 'PlayerTurn[]': length, pop, push, concat, and 35 more.
src/apps/checkers/front-end/App.vue(375,16): error TS2322: Type 'ComputedRef<boolean>' is not assignable to type 'boolean | undefined'.
src/apps/checkers/front-end/App.vue(376,16): error TS2322: Type 'Ref<boolean, boolean>' is not assignable to type 'boolean | undefined'.


=== TYPE ERRORS FOR FILE: src/apps/chess/front-end/App.vue ===
src/apps/chess/front-end/App.vue(90,55): error TS2345: Argument of type 'ChessMatchState | ChessBoardPiece[]' is not assignable to parameter of type 'ChessPiece[] | ChessMatchState'.


=== TYPE ERRORS FOR FILE: src/apps/poker-holdem/front-end/App.vue ===
src/apps/poker-holdem/front-end/App.vue(131,7): error TS7053: Element implicitly has an 'any' type because expression of type 'number' can't be used to index type 'Record<1 | 2, Card[]>'.
src/apps/poker-holdem/front-end/App.vue(273,14): error TS2367: This comparison appears to be unintentional because the types '"loss" | "draw"' and '"lose"' have no overlap.


=== TYPE ERRORS FOR FILE: src/apps/poker-holdem/back-end/adapter.ts ===
src/apps/poker-holdem/back-end/adapter.ts(65,19): error TS2339: Property 'type' does not exist on type 'never'.


=== LINT ERRORS FOR FILE: src/apps/blackjack/back-end/rules.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\blackjack\back-end\rules.ts
   66:7   error  'EMPTY_HAND' is assigned a value but never used       @typescript-eslint/no-unused-vars
  350:7   error  'seatDelta' is never reassigned. Use 'const' instead  prefer-const
  396:10  error  'markSeatBust' is defined but never used              @typescript-eslint/no-unused-vars
  413:7   error  'deck' is never reassigned. Use 'const' instead       prefer-const
  419:7   error  'state' is never reassigned. Use 'const' instead      prefer-const

✖ 5 problems (5 errors, 0 warnings)
  3 errors and 0 warnings potentially fixable with the `--fix` option.


=== TYPE ERRORS FOR FILE: src/apps/blackjack/front-end/App.vue ===
src/apps/blackjack/front-end/App.vue(352,19): error TS2304: Cannot find name 'formatLabQuarksNumber'.
src/apps/blackjack/front-end/App.vue(359,20): error TS2304: Cannot find name 'formatLabQuarksNumber'.


=== TYPE ERRORS FOR FILE: src/apps/blackjack/front-end/composables/useBlackjackTurnPresentation.ts ===
src/apps/blackjack/front-end/composables/useBlackjackTurnPresentation.ts(23,14): error TS2304: Cannot find name 'MatchView'.


=== TYPE ERRORS FOR FILE: src/apps/word-tile/back-end/rules.ts ===
src/apps/word-tile/back-end/rules.ts(1,30): error TS2307: Cannot find module 'node:fs' or its corresponding type declarations.
src/apps/word-tile/back-end/rules.ts(2,18): error TS2307: Cannot find module 'node:path' or its corresponding type declarations.
src/apps/word-tile/back-end/rules.ts(3,31): error TS2307: Cannot find module 'node:url' or its corresponding type declarations.
src/apps/word-tile/back-end/rules.ts(239,11): error TS7006: Parameter 'w' implicitly has an 'any' type.
src/apps/word-tile/back-end/rules.ts(240,14): error TS7006: Parameter 'w' implicitly has an 'any' type.


=== TYPE ERRORS FOR FILE: src/shared/composables/lab-sidecar/useLabSidecarGameSession.ts ===
src/shared/composables/lab-sidecar/useLabSidecarGameSession.ts(72,5): error TS2322: Type 'GameDifficulty | null' is not assignable to type 'GameDifficulty | undefined'.


=== TYPE ERRORS FOR FILE: src/shared/composables/components/useLabDashboard.ts ===
src/shared/composables/components/useLabDashboard.ts(457,53): error TS2339: Property 'trim' does not exist on type 'string | ChatMessageContent[]'.


=== LINT ERRORS FOR FILE: src/tests/ci/shared/lab-game-sidecar-preferences.test.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\tests\ci\shared\lab-game-sidecar-preferences.test.ts
  18:13  error  '_field' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== TYPE ERRORS FOR FILE: src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts ===
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(37,12): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(37,16): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(37,22): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(37,27): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(37,29): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(37,37): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(37,86): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(38,12): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(38,49): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(38,54): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(38,56): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(38,64): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(38,113): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(40,15): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(40,52): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(40,56): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(40,66): error TS1003: Identifier expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(46,15): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(46,31): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(46,32): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(46,45): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(46,49): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(46,54): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(46,63): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(46,65): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(46,70): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(46,75): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(46,78): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(46,89): error TS1003: Identifier expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(60,20): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(60,21): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(60,33): error TS1443: Module declaration names may only use ' or " quoted strings.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(61,8): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(61,51): error TS1005: ')' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(61,67): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(64,14): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(64,17): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(64,31): error TS1435: Unknown keyword or identifier. Did you mean 'set'?
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(64,36): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(64,48): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(65,9): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(65,45): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(65,48): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(65,59): error TS1435: Unknown keyword or identifier. Did you mean 'set'?
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(65,64): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(65,82): error TS1109: Expression expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(65,90): error TS1005: ')' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(65,96): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(65,100): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(65,104): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(65,120): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(65,125): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(65,133): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(65,137): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(65,138): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(66,8): error TS1109: Expression expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(66,14): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(66,25): error TS1109: Expression expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(66,29): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(66,39): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(67,8): error TS1109: Expression expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(67,17): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(67,22): error TS1109: Expression expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(67,26): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(67,47): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(67,78): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(80,14): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(80,58): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(80,64): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(80,67): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(80,77): error TS1003: Identifier expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(98,20): error TS1005: ']' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(98,31): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(98,33): error TS1109: Expression expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(98,41): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(98,47): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(100,1): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(100,12): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(100,47): error TS1109: Expression expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(100,58): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(100,65): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(100,69): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(100,75): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(100,80): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(100,94): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(100,118): error TS1005: ')' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(100,136): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(100,137): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(100,139): error TS1435: Unknown keyword or identifier. Did you mean 'this'?
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(100,144): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(100,152): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(100,168): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(100,180): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(100,182): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(100,186): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(100,190): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(100,194): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(100,204): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(100,206): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(100,212): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(100,222): error TS1003: Identifier expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(102,1): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(102,2): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(102,3): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(102,5): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(102,26): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(102,34): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(102,39): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(102,44): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(103,1): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(105,1): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(105,2): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(105,3): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(105,5): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,1): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(108,1): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(108,2): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(108,3): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(108,5): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(108,11): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(108,15): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(109,1): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(111,1): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(111,12): error TS1005: '(' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(111,34): error TS1005: ')' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(111,55): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(111,58): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(111,69): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(111,82): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(111,92): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(111,123): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(111,130): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(111,132): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(111,147): error TS1003: Identifier expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(113,1): error TS1160: Unterminated template literal.


=== TYPE ERRORS FOR FILE: src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts ===
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(43,12): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(43,16): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(43,22): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(43,27): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(43,29): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(43,37): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(43,50): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(44,12): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(44,49): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(44,54): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(44,56): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(44,64): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(44,77): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(46,15): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(46,52): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(46,56): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(46,66): error TS1003: Identifier expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(52,15): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(52,31): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(52,32): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(52,45): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(52,49): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(52,54): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(52,63): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(52,65): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(52,70): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(52,75): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(52,78): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(52,89): error TS1003: Identifier expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(66,20): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(66,21): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(66,33): error TS1443: Module declaration names may only use ' or " quoted strings.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(67,8): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(67,51): error TS1005: ')' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(67,67): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(70,14): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(70,17): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(70,31): error TS1435: Unknown keyword or identifier. Did you mean 'set'?
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(70,36): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(70,48): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,9): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,45): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,48): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,59): error TS1435: Unknown keyword or identifier. Did you mean 'set'?
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,64): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,82): error TS1109: Expression expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,90): error TS1005: ')' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,96): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,100): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,104): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,120): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,125): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,133): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,137): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,138): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(72,8): error TS1109: Expression expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(72,14): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(72,25): error TS1109: Expression expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(72,29): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(72,39): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(73,8): error TS1109: Expression expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(73,17): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(73,22): error TS1109: Expression expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(73,26): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(73,47): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(73,86): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(86,14): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(86,58): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(86,64): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(86,67): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(86,77): error TS1003: Identifier expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(104,20): error TS1005: ']' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(104,31): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(104,33): error TS1109: Expression expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(104,41): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(104,47): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,1): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,12): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,47): error TS1109: Expression expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,58): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,65): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,69): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,75): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,80): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,94): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,118): error TS1005: ')' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,136): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,137): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,139): error TS1435: Unknown keyword or identifier. Did you mean 'this'?
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,144): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,152): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,168): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,180): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,182): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,186): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,190): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,194): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,204): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,206): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,212): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,222): error TS1003: Identifier expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(108,1): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(108,2): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(108,3): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(108,5): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(108,26): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(108,34): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(108,39): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(108,44): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(109,1): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(111,1): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(111,2): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(111,3): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(111,5): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(112,1): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(114,1): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(114,2): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(114,3): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(114,5): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(114,11): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(114,15): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(115,1): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(117,1): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(117,12): error TS1005: '(' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(117,34): error TS1005: ')' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(117,55): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(117,58): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(117,69): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(117,82): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(117,92): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(117,123): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(117,130): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(117,132): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(117,147): error TS1003: Identifier expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(119,1): error TS1160: Unterminated template literal.


=== TYPE ERRORS FOR FILE: src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts ===
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(43,12): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(43,16): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(43,22): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(43,27): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(43,29): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(43,37): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(43,50): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(44,12): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(44,49): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(44,54): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(44,56): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(44,64): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(44,77): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(46,15): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(46,52): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(46,56): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(46,66): error TS1003: Identifier expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(52,15): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(52,31): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(52,32): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(52,45): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(52,49): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(52,54): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(52,63): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(52,65): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(52,70): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(52,75): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(52,78): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(52,89): error TS1003: Identifier expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(66,20): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(66,21): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(66,33): error TS1443: Module declaration names may only use ' or " quoted strings.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(67,8): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(67,51): error TS1005: ')' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(67,67): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(70,14): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(70,17): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(70,31): error TS1435: Unknown keyword or identifier. Did you mean 'set'?
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(70,36): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(70,48): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,9): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,45): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,48): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,59): error TS1435: Unknown keyword or identifier. Did you mean 'set'?
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,64): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,82): error TS1109: Expression expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,90): error TS1005: ')' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,96): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,100): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,104): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,120): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,125): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,133): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,137): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(71,138): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(72,8): error TS1109: Expression expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(72,14): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(72,25): error TS1109: Expression expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(72,29): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(72,39): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(73,8): error TS1109: Expression expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(73,17): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(73,22): error TS1109: Expression expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(73,26): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(73,47): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(73,86): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(86,14): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(86,58): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(86,64): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(86,67): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(86,77): error TS1003: Identifier expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(104,20): error TS1005: ']' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(104,31): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(104,33): error TS1109: Expression expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(104,41): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(104,47): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,1): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,12): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,47): error TS1109: Expression expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,58): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,65): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,69): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,75): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,80): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,94): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,118): error TS1005: ')' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,136): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,137): error TS1129: Statement expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,139): error TS1435: Unknown keyword or identifier. Did you mean 'this'?
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,144): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,152): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,168): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,180): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,182): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,186): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,190): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,194): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,204): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,206): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,212): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(106,222): error TS1003: Identifier expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(108,1): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(108,2): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(108,3): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(108,5): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(108,26): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(108,34): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(108,39): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(108,44): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(109,1): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(111,1): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(111,2): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(111,3): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(111,5): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(112,1): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(114,1): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(114,2): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(114,3): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(114,5): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(114,11): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(114,15): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(115,1): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(117,1): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(117,12): error TS1005: '(' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(117,34): error TS1005: ')' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(117,55): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(117,58): error TS1005: ',' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(117,69): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(117,82): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(117,92): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(117,123): error TS1005: ';' expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(117,130): error TS1127: Invalid character.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(117,132): error TS1434: Unexpected keyword or identifier.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(117,147): error TS1003: Identifier expected.
src/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt.ts(119,1): error TS1160: Unterminated template literal.


=== LINT ERRORS FOR FILE: src/apps/billiards/back-end/adapter.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\billiards\back-end\adapter.ts
   93:47  error  '_playerSeat' is defined but never used  @typescript-eslint/no-unused-vars
  251:21  error  '_state' is defined but never used       @typescript-eslint/no-unused-vars
  251:38  error  '_move' is defined but never used        @typescript-eslint/no-unused-vars
  251:54  error  '_moverSeat' is defined but never used   @typescript-eslint/no-unused-vars

✖ 4 problems (4 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/apps/billiards/front-end/components/BilliardsTable.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\billiards\front-end\components\BilliardsTable.vue
  13:3  error  'TABLE_WIDTH' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== TYPE ERRORS FOR FILE: src/apps/billiards/shared/billiards-matter-sim.ts ===
src/apps/billiards/shared/billiards-matter-sim.ts(112,10): error TS2339: Property 'motionThreshold' does not exist on type 'Engine'.


=== LINT ERRORS FOR FILE: src/apps/billiards/front-end/components/BilliardsTable.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\billiards\front-end\components\BilliardsTable.vue
    3:30  error  'makeDraggable' is defined but never used     @typescript-eslint/no-unused-vars
  155:9   error  'x' is never reassigned. Use 'const' instead  prefer-const

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/apps/billiards/shared/billiards-rapier-sim.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\billiards\shared\billiards-rapier-sim.ts
  170:67  error  '_deltaMs' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/apps/billiards/front-end/components/BilliardsTable.vue ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\billiards\front-end\components\BilliardsTable.vue
    2:20  error  'onBeforeUnmount' is defined but never used             @typescript-eslint/no-unused-vars
    2:37  error  'onMounted' is defined but never used                   @typescript-eslint/no-unused-vars
  334:10  error  'tablePointFromPointerEvent' is defined but never used  @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/apps/billiards/shared/table-playfield.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\billiards\shared\table-playfield.ts
   3:3  error  'TABLE_BUMPER_NOSE' is defined but never used  @typescript-eslint/no-unused-vars
   4:3  error  'TABLE_HEIGHT' is defined but never used       @typescript-eslint/no-unused-vars
   6:3  error  'TABLE_RAIL_INSET' is defined but never used   @typescript-eslint/no-unused-vars
   7:3  error  'TABLE_WIDTH' is defined but never used        @typescript-eslint/no-unused-vars
  95:7  error  'px' is never reassigned. Use 'const' instead  prefer-const
  96:7  error  'py' is never reassigned. Use 'const' instead  prefer-const

✖ 6 problems (6 errors, 0 warnings)
  2 errors and 0 warnings potentially fixable with the `--fix` option.


=== LINT ERRORS FOR FILE: src/apps/billiards/shared/table-pocket-visual.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\billiards\shared\table-pocket-visual.ts
  173:7   error  'BUMPER_SAMPLE' is assigned a value but never used    @typescript-eslint/no-unused-vars
  180:10  error  'pocketMouthXOnHorizontal' is defined but never used  @typescript-eslint/no-unused-vars
  190:10  error  'pocketMouthYOnVertical' is defined but never used    @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/apps/billiards/shared/table-pocket-visual.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\billiards\shared\table-pocket-visual.ts
  6:3  error  'TABLE_BUMPER_NOSE' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/apps/billiards/shared/table-pocket-visual.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\billiards\shared\table-pocket-visual.ts
  7:3  error  'TABLE_CLOTH_CORNER_RADIUS' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/apps/billiards/front-end/components/BilliardsTableChrome.vue ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\billiards\front-end\components\BilliardsTableChrome.vue
  11:3  error  'TABLE_WOOD_RAIL' is defined but never used       @typescript-eslint/no-unused-vars
  66:7  error  'cushionCuts' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/apps/billiards/shared/table-cushion-wall-segments.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\billiards\shared\table-cushion-wall-segments.ts
    4:3   error  'TABLE_HEIGHT' is defined but never used        @typescript-eslint/no-unused-vars
    5:3   error  'TABLE_RAIL_INSET' is defined but never used    @typescript-eslint/no-unused-vars
    6:3   error  'TABLE_WIDTH' is defined but never used         @typescript-eslint/no-unused-vars
   22:7   error  'WALL_HALF' is assigned a value but never used  @typescript-eslint/no-unused-vars
  124:10  error  'topCutouts' is defined but never used          @typescript-eslint/no-unused-vars
  150:10  error  'bottomCutouts' is defined but never used       @typescript-eslint/no-unused-vars
  176:10  error  'leftCutouts' is defined but never used         @typescript-eslint/no-unused-vars
  201:10  error  'rightCutouts' is defined but never used        @typescript-eslint/no-unused-vars
  232:36  error  'clothW' is assigned a value but never used     @typescript-eslint/no-unused-vars
  232:47  error  'clothH' is assigned a value but never used     @typescript-eslint/no-unused-vars

✖ 10 problems (10 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/apps/billiards/shared/table-cushion-wall-segments.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\billiards\shared\table-cushion-wall-segments.ts
  30:10  error  'mergeIntervals' is defined but never used   @typescript-eslint/no-unused-vars
  73:36  error  'clothW' is assigned a value but never used  @typescript-eslint/no-unused-vars
  73:47  error  'clothH' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/apps/billiards/front-end/composables/useBilliardsThreeTable.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\billiards\front-end\composables\useBilliardsThreeTable.ts
  147:11  error  'overlayPoses' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== TYPE ERRORS FOR FILE: src/apps/billiards/shared/table-rail-bumpers.ts ===
src/apps/billiards/shared/table-rail-bumpers.ts(229,20): error TS2345: Argument of type '[number, number] | null' is not assignable to parameter of type '[number, number]'.
src/apps/billiards/shared/table-rail-bumpers.ts(239,20): error TS2345: Argument of type '[number, number] | null' is not assignable to parameter of type '[number, number]'.


=== TYPE ERRORS FOR FILE: src/apps/billiards/front-end/components/BilliardsTableChrome.vue ===
src/apps/billiards/front-end/components/BilliardsTableChrome.vue(2,20): error TS2440: Import declaration conflicts with local declaration of 'withDefaults'.


=== TYPE ERRORS FOR FILE: src/apps/billiards/shared/billiards-rapier-sim.ts ===
src/apps/billiards/shared/billiards-rapier-sim.ts(118,33): error TS2345: Argument of type 'false' is not assignable to parameter of type 'QueryFilterFlags | undefined'.


=== LINT ERRORS FOR FILE: src/apps/billiards/shared/table-pocket-visual.ts ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\billiards\shared\table-pocket-visual.ts
  10:3  error  'TABLE_RAIL_INSET' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== LINT ERRORS FOR FILE: src/apps/billiards/shared/table-cushion-wall-segments.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\billiards\shared\table-cushion-wall-segments.ts
  1:10  error  'BALL_RADIUS' is defined but never used   @typescript-eslint/no-unused-vars
  1:50  error  'TABLE_HEIGHT' is defined but never used  @typescript-eslint/no-unused-vars
  1:64  error  'TABLE_WIDTH' is defined but never used   @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)


=== LINT ERRORS FOR FILE: src/apps/billiards/front-end/components/BilliardsDevGrid.vue ===

c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\billiards\front-end\components\BilliardsDevGrid.vue
  67:3  warning  Unused eslint-disable directive (no problems were reported from 'no-console')
  71:3  warning  Unused eslint-disable directive (no problems were reported from 'no-console')

✖ 2 problems (0 errors, 2 warnings)
  0 errors and 2 warnings potentially fixable with the `--fix` option.




=== TYPE ERRORS FOR FILE: src/apps/billiards/shared/table-rail-bumpers.ts ===
src/apps/billiards/shared/table-rail-bumpers.ts(29,21): error TS2552: Cannot find name 'TABLE_BUMPER_NOSE'. Did you mean 'TABLE_BUMPER_OUTSET'?
src/apps/billiards/shared/table-rail-bumpers.ts(44,41): error TS2552: Cannot find name 'TABLE_BUMPER_BAND_INSET_TOWARD_CENTER'. Did you mean 'BUMPER_BAND_INSET_TOWARD_CENTER'?
src/apps/billiards/shared/table-rail-bumpers.ts(58,11): error TS2304: Cannot find name 'TABLE_BUMPER_SIDE_RAIL_OUTER_SHIFT'.
src/apps/billiards/shared/table-rail-bumpers.ts(68,11): error TS2304: Cannot find name 'TABLE_BUMPER_SIDE_RAIL_OUTER_SHIFT'.
src/apps/billiards/shared/table-rail-bumpers.ts(834,21): error TS2304: Cannot find name 'TABLE_HEIGHT'.
src/apps/billiards/shared/table-rail-bumpers.ts(836,21): error TS2304: Cannot find name 'TABLE_WIDTH'.
src/apps/billiards/shared/table-rail-bumpers.ts(848,22): error TS2304: Cannot find name 'TABLE_WIDTH'.
src/apps/billiards/shared/table-rail-bumpers.ts(849,22): error TS2304: Cannot find name 'TABLE_HEIGHT'.


=== LINT ERRORS FOR FILE: src/apps/billiards/shared/table-rail-bumpers.ts ===
c:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\billiards\shared\table-rail-bumpers.ts
  497:10  error  'horizontalBumperPath' is defined but never used      @typescript-eslint/no-unused-vars
  523:10  error  'horizontalBumperNosePath' is defined but never used  @typescript-eslint/no-unused-vars
  538:10  error  'verticalBumperPath' is defined but never used        @typescript-eslint/no-unused-vars
  564:10  error  'verticalBumperNosePath' is defined but never used    @typescript-eslint/no-unused-vars

✖ 4 problems (4 errors, 0 warnings)


=== TYPE ERRORS FOR FILE: src/apps/billiards/back-end/adapter.ts ===
src/apps/billiards/back-end/adapter.ts(439,9): error TS2322: Type '(s: any, seat: any, tier: any, retry: any) => string' is not assignable to type '(context: AgentLoopContext<BilliardsMatchState>) => string'.
src/apps/billiards/back-end/adapter.ts(439,27): error TS7006: Parameter 's' implicitly has an 'any' type.
src/apps/billiards/back-end/adapter.ts(439,30): error TS7006: Parameter 'seat' implicitly has an 'any' type.
src/apps/billiards/back-end/adapter.ts(439,36): error TS7006: Parameter 'tier' implicitly has an 'any' type.
src/apps/billiards/back-end/adapter.ts(439,42): error TS7006: Parameter 'retry' implicitly has an 'any' type.
src/apps/billiards/back-end/adapter.ts(444,19): error TS7006: Parameter 'raw' implicitly has an 'any' type.
src/apps/billiards/back-end/adapter.ts(444,24): error TS7006: Parameter 's' implicitly has an 'any' type.
src/apps/billiards/back-end/adapter.ts(444,27): error TS7006: Parameter 'seat' implicitly has an 'any' type.
src/apps/billiards/back-end/adapter.ts(450,27): error TS7006: Parameter 'content' implicitly has an 'any' type.
src/apps/billiards/back-end/adapter.ts(450,36): error TS7006: Parameter 's' implicitly has an 'any' type.
src/apps/billiards/back-end/adapter.ts(450,39): error TS7006: Parameter 'seat' implicitly has an 'any' type.


=== TYPE ERRORS FOR FILE: src/apps/billiards/back-end/adapter.ts ===
src/apps/billiards/back-end/adapter.ts(472,9): error TS2353: Object literal may only specify known properties, and 'parseAgentReply' does not exist in type 'AgentLoopGame<BilliardsMatchState, Record<string, unknown>>'.
src/apps/billiards/back-end/adapter.ts(472,27): error TS7006: Parameter 'content' implicitly has an 'any' type.
src/apps/billiards/back-end/adapter.ts(472,36): error TS7006: Parameter 's' implicitly has an 'any' type.
src/apps/billiards/back-end/adapter.ts(472,39): error TS7006: Parameter 'seat' implicitly has an 'any' type.


=== TYPE ERRORS FOR FILE: src/apps/billiards/front-end/components/BilliardsTable.vue ===
src/apps/billiards/front-end/components/BilliardsTable.vue(617,7): error TS2741: Property 'primary' is missing in type '{ secondary: string; }' but required in type 'BilliardsTableStatusParts'.
src/apps/billiards/front-end/components/BilliardsTable.vue(949,34): error TS2345: Argument of type '{ phase: BilliardsPhase; layoutLocked: boolean; rulesProfile: BilliardsRulesProfile; balls: { id: string; number: number; x: number; y: number; pocketed: boolean; pocketedBySeat?: number | ... 1 more ... | undefined; }[]; ... 11 more ...; continueTurnSeat?: number | ... 1 more ... | undefined; } | null' is not assignable to parameter of type 'BilliardsMatchState'.


=== TYPE ERRORS FOR FILE: src/apps/billiards/front-end/components/BilliardsTable.vue ===
src/apps/billiards/front-end/components/BilliardsTable.vue(684,7): error TS2741: Property 'primary' is missing in type '{ secondary: string; }' but required in type 'BilliardsTableStatusParts'.
src/apps/billiards/front-end/components/BilliardsTable.vue(1031,34): error TS2345: Argument of type '{ phase: BilliardsPhase; layoutLocked: boolean; rulesProfile: BilliardsRulesProfile; balls: { id: string; number: number; x: number; y: number; pocketed: boolean; pocketedBySeat?: number | ... 1 more ... | undefined; }[]; ... 11 more ...; continueTurnSeat?: number | ... 1 more ... | undefined; } | null' is not assignable to parameter of type 'BilliardsMatchState'.


=== TYPE ERRORS FOR FILE: src/apps/billiards/front-end/components/BilliardsTable.vue ===
src/apps/billiards/front-end/components/BilliardsTable.vue(711,7): error TS2741: Property 'primary' is missing in type '{ secondary: string; }' but required in type 'BilliardsTableStatusParts'.


=== TYPE ERRORS FOR FILE: src/apps/billiards/front-end/components/BilliardsTable.vue ===
src/apps/billiards/front-end/components/BilliardsTable.vue(899,7): error TS2741: Property 'primary' is missing in type '{ secondary: string; }' but required in type 'BilliardsTableStatusParts'.


=== TYPE ERRORS FOR FILE: src/apps/billiards/front-end/components/BilliardsTable.vue ===
src/apps/billiards/front-end/components/BilliardsTable.vue(899,7): error TS2741: Property 'primary' is missing in type '{ secondary: string; }' but required in type 'BilliardsTableStatusParts'.


=== TYPE ERRORS FOR FILE: src/apps/billiards/back-end/adapter.ts ===
src/apps/billiards/back-end/adapter.ts(513,5): error TS2322: Type 'number' is not assignable to type '1 | 2 | null'.


=== LINT ERRORS FOR FILE: src/apps/billiards/front-end/App.vue ===
C:\Users\mikeb\source\repos\LLM_Workspace\the-lab\src\apps\billiards\front-end\App.vue
  2:68  error  'toRaw' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


=== TYPE ERRORS FOR FILE: src/apps/billiards/front-end/stores/billiardsPresentation.ts ===
src/apps/billiards/front-end/stores/billiardsPresentation.ts(470,20): error TS2304: Cannot find name 'state'.


=== TYPE ERRORS FOR FILE: src/apps/billiards/front-end/components/BilliardsTable.vue ===
src/apps/billiards/front-end/components/BilliardsTable.vue(2365,12): error TS2322: Type 'Ref<boolean, boolean>' is not assignable to type 'boolean | undefined'.
src/apps/billiards/front-end/components/BilliardsTable.vue(2366,12): error TS2322: Type 'Ref<boolean, boolean>' is not assignable to type 'boolean | undefined'.
src/apps/billiards/front-end/components/BilliardsTable.vue(2374,12): error TS2322: Type 'Ref<boolean, boolean>' is not assignable to type 'boolean | undefined'.
src/apps/billiards/front-end/components/BilliardsTable.vue(2375,12): error TS2322: Type 'true | Ref<boolean, boolean>' is not assignable to type 'boolean | undefined'.


=== TYPE ERRORS FOR FILE: src/apps/chess/front-end/App.vue ===
src/apps/chess/front-end/App.vue(505,19): error TS2322: Type 'Ref<boolean, boolean>' is not assignable to type 'boolean | undefined'.
src/apps/chess/front-end/App.vue(506,19): error TS2322: Type 'Ref<boolean, boolean>' is not assignable to type 'boolean | undefined'.
src/apps/chess/front-end/App.vue(507,19): error TS2322: Type 'Ref<number, number>' is not assignable to type 'number'.
src/apps/chess/front-end/App.vue(515,12): error TS2322: Type 'ComputedRef<number>' is not assignable to type 'number'.
src/apps/chess/front-end/App.vue(516,12): error TS2740: Type 'ComputedRef<{ label: string; value: number; }[]>' is missing the following properties from type 'readonly { label: string; value: number; }[]': length, concat, join, slice, and 26 more.


=== TYPE ERRORS FOR FILE: src/apps/chess/front-end/App.vue ===
src/apps/chess/front-end/App.vue(514,19): error TS2322: Type 'Ref<boolean, boolean>' is not assignable to type 'boolean | undefined'.
src/apps/chess/front-end/App.vue(515,19): error TS2322: Type 'Ref<boolean, boolean>' is not assignable to type 'boolean | undefined'.
src/apps/chess/front-end/App.vue(516,19): error TS2322: Type 'Ref<number, number>' is not assignable to type 'number'.
src/apps/chess/front-end/App.vue(524,12): error TS2322: Type 'ComputedRef<number>' is not assignable to type 'number'.
src/apps/chess/front-end/App.vue(525,12): error TS2740: Type 'ComputedRef<{ label: string; value: number; }[]>' is missing the following properties from type 'readonly { label: string; value: number; }[]': length, concat, join, slice, and 26 more.
