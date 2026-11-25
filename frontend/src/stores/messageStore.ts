import { create } from "zustand";

type MessageStore = {
    text: string,
    setText: (text: string) => void,
}

const messageStore = create<MessageStore>((set) => ({
    text: "",
    setText: (text) => {
        set({ text: text }),
        setTimeout(() => {
            set({ text: "" })
        }, 1000 * 5)
    },
}))

export {
    messageStore
}