import { create } from 'zustand';

/**
 * @typedef {object} EditorComponent
 * @property {string} id
 * @property {string} type
 * @property {object} props
 * @property {{ x: number, y: number }} position
 */

/**
 * @typedef {object} EditorState
 * @property {EditorComponent[]} components
 * @property {string|null} selectedComponentId
 * @property {(componentType: string, position: { x: number, y: number }) => void} addComponent
 * @property {(componentId: string, newProps: object) => void} updateComponentProps
 * @property {(componentId: string) => void} selectComponent
 * @property {(componentId: string, newPosition: { x: number, y: number }) => void} moveComponent
 */

/**
 * @type {import('zustand').UseBoundStore<import('zustand').StoreApi<EditorState>>}
 */
const useEditorStore = create((set) => ({
  components: [],
  selectedComponentId: null,

  addComponent: (componentType, position) =>
    set((state) => ({
      components: [
        ...state.components,
        {
          id: `${componentType}-${Date.now()}`,
          type: componentType,
          props: {},
          position,
        },
      ],
    })),

  updateComponentProps: (componentId, newProps) =>
    set((state) => ({
      components: state.components.map((component) =>
        component.id === componentId
          ? { ...component, props: { ...component.props, ...newProps } }
          : component
      ),
    })),

  selectComponent: (componentId) => set({ selectedComponentId: componentId }),

  moveComponent: (componentId, newPosition) =>
    set((state) => ({
      components: state.components.map((component) =>
        component.id === componentId
          ? { ...component, position: newPosition }
          : component
      ),
    })),
}));

export default useEditorStore;
