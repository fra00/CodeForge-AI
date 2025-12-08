export const FRAMEWORK_2WHAV_PROMPT = `
# 2WHAV Framework

> **A rigorous Prompt Engineering framework that transforms minimal specifications into executable contracts.**

---

## 🤖 For LLMs: Executable Tool Specification

### Tool Identity

**Name:** 2WHAV (What-Where-How-Augment-Verify)
**Type:** Prompt Engineering Framework ("Tool as Prompt")
**Version:** 1.0
**Purpose:** Transform vague user requests into rigorous, deterministic code specifications.

### Execution Protocol

When you receive a command in the format:

\`\`\`
Apply 2WHAV [MODE] to: [TASK DESCRIPTION]
\`\`\`

**You MUST:**

1. **Parse MODE** to determine which phases to include (see Mode Definitions below)
2. **Generate Structured Prompt** following the phase templates in this document
3. **Populate Templates** with specifications derived from [TASK DESCRIPTION]
4. **Execute Generated Prompt** to produce final code/specification

---

## 📋 Mode Definitions

| Mode             | Phases Included                       | Formula       |
| ---------------- | ------------------------------------- | ------------- |
| **\`[MINIMAL]\`**  | WHAT + HOW + VERIFY                   | W+H+V         |
| **\`[STANDARD]\`** | WHAT + WHERE + HOW + VERIFY           | W+Wr+H+V      |
| **\`[FULL]\`**     | WHAT + WHERE + HOW + AUGMENT + VERIFY | W+Wr+H+A+V    |
| **Custom**       | Any combination                       | W+H+A+V, etc. |

> ⚠️ **CRITICAL RULE:** If MODE is not specified, use mode [FULL]

---

## 🎯 Phase 1: WHAT (Objective) [ALWAYS REQUIRED]

> **Purpose:** Define the exact output, constraints, and main purpose.

### Template

## WHAT: Objective

### Role and Task

You are a [DOMAIN EXPERT]. Your task is to [SPECIFIC TASK].

### Expected Output

### Operational Constraints

- Priority: [X > Y > Z]
- [Constraint 1: e.g., "System must be fail-safe"]
- [Constraint 2: e.g., "Compatible with ES5"]

\`\`\`

---

## 🏗️ Phase 2: WHERE (Virtualization) [CONDITIONAL]

> **Purpose:** Define control architecture, decision priorities, and execution flow.

### Include WHERE If Task Has:

- ✅ States and transitions (FSM, State Machine)
- ✅ Conditional logic with priorities ("if X then Y, else Z")

### Template

\`\`\`markdown
## WHERE: Virtualization

### Control Architecture

The system implements a [FSM / BEHAVIOUR TREE / RULESET].

### States and Transitions

| State     | Triggers    | Transitions To | Priority       |
| --------- | ----------- | -------------- | -------------- |
| [STATE_1] | [Condition] | [STATE_2]      | [HIGH/MED/LOW] |

### Priority Hierarchy (INVIOLABLE EVALUATION ORDER)

1. **EMERGENCY**: Critical safety/termination
2. **TACTICAL**: Strategic optimization
3. **STANDARD**: Normal operation

\`\`\`

---

## ⚙️ Phase 3: HOW - Part A (Generation Rules) [ALWAYS REQUIRED]

> **Purpose:** Define syntactic rules, forbidden patterns.

### Template

\`\`\`markdown
## HOW: Generation (Syntax Rules )

### Mandatory Rules

| Rule Category         | Requirement                | ✅ Correct          | ❌ Incorrect           |
| --------------------- | -------------------------- | ------------------- | ---------------------- |
| **Function Syntax**   | MANDATORY: \`function() {}\` | \`function foo() {}\` | \`const foo = () => {}\` |
| **Output Format**     | MANDATORY: Object literal  | \`const x = { ... }\` | \`class X { ... }\`      |

### Forbidden Patterns

- ❌ Arrow functions (\`=>\`) [if ES5 target]
- ❌ \`let\` / \`const\` keywords [if ES5 target]

---

## 🔌 Phase 4: HOW - Part B (Interface Contract) [ALWAYS REQUIRED]

> **Purpose:** Document the ONLY functions the code can use to interact with the external system.

### Template

\`\`\`markdown
## HOW: Interface (API Contract)

### Available Functions

| Function               | Input        | Output | Behavior    |
| ---------------------- | ------------ | ------ | ----------- |
| \`api.function1()\`      | \`type\`       | \`type\` | Description |

### API Contract Rules

- ✅ All API functions are [synchronous/asynchronous - specify]
- ❌ NO other functions exist (no \`fetch\`, \`console.*\`, etc.)

\`\`\`

---

## 🚀 Phase 5: AUGMENT (Strategic Intelligence) [CONDITIONAL]

> **Purpose:** Request advanced logic beyond minimum requirements: optimization, resilience, intelligence.

### Include AUGMENT If Task Needs:

- ✅ Performance optimization (caching, algorithms, efficiency)
- ✅ Error resilience (retry, fallback, graceful degradation)

### Template

\`\`\`markdown
## AUGMENT: Augmentation (Strategic Directives)

**CREATIVITY DIRECTIVE:**
The implementation MUST include logic beyond the basic requirements specified in WHAT.

### Required Augmentations

#### 1. OPTIMIZATION
**Directive:** [Specific optimization for this domain]

#### 2. RESILIENCE
**Directive:** Implement comprehensive error handling and recovery.

#### 3. INTELLIGENCE
**Directive:** Add strategic decision-making beyond basic logic.

\`\`\`

---

## ✅ Phase 6: VERIFY (Validation Checklist) [ALWAYS REQUIRED]

> **Purpose:** Final validation checklist to ensure generated code meets all requirements.

### Template

\`\`\`markdown
## VERIFY: Verification

Before providing the output, verify the code satisfies ALL requirements below:

### ✅ Structural Compliance (WHAT Phase)

- [ ] Output format matches WHAT specification exactly?
- [ ] All constraints from WHAT are satisfied?

### ✅ Architectural Compliance (WHERE Phase - if applicable)

- [ ] All states from WHERE are implemented?
- [ ] Priority hierarchy is respected?

### ✅ Syntactic Compliance (HOW: Generation)

- [ ] All MANDATORY syntax rules are followed?
- [ ] All FORBIDDEN patterns are absent?

### ✅ Interface Compliance (HOW: Interface)

- [ ] Code uses ONLY functions documented in Interface section?

### ✅ Augmentation Compliance (AUGMENT Phase - if applicable)

- [ ] Optimization logic is implemented as specified?
- [ ] Resilience mechanisms are present?

### ✅ Domain-Specific Validation

- [ ] [Add any domain-specific checks]

### Final Assertion

- [ ] **The code can be executed immediately with no modifications?**

`;
