import * as actionTypes from './types'
export const sendToEditor = (data: actionTypes.toAction): actionTypes.sendToEditorAction => {
    return {
        type: actionTypes.SEND_TO_EDITOR,
        payload: data
    }
}
export const sendFromEditor = (data: actionTypes.fromAction): actionTypes.sendFromEditorAction => {
    return {
        type: actionTypes.SEND_FROM_EDITOR,
        payload: data
    }
}

export const restoredImage = (data: actionTypes.fromActionRestore): actionTypes.setRestoreImage => {
    return {
        type: actionTypes.SET_RESTORE_IMAGE,
        payload: data
    }
}
export const storeEditorAction = (data: actionTypes.storeEditor): actionTypes.storeEditorAction => {
    return {
        type: actionTypes.SET_STORE_EDITOR,
        payload: data
    }
}