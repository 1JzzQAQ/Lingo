import { creat } from "zustand"

type ExitModalState ={
    isOpen: boolean
    open: () => void
    close: () => void
}

export const useExitModal = creat<ExitModalState>((set) => ({
    isOpen: false,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
}))