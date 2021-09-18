import { DrawPos } from '../pages/types';
export const SEND_TO_EDITOR = 'SEND_TO_EDITOR'
export const SEND_FROM_EDITOR = 'SEND_FROM_EDITOR'
export const SET_RESTORE_IMAGE = 'SET_RESTORE_IMAGE'
export const SET_STORE_EDITOR = 'SET_STORE_EDITOR'
export interface toAction {
    orignalImage: string,
    removedImage: string,
    idx: number,
}
export interface fromAction {
    modifiedImage: string
}
export interface fromActionRestore {
    restoredImage: string
}
export interface storeEditor {
    drawnPos: DrawPos[] | [],
    mode: number,
    color:string,
    image:any,
    blur:number
}
export type sendToEditorAction = { type: typeof SEND_TO_EDITOR, payload: toAction }
export type sendFromEditorAction = { type: typeof SEND_FROM_EDITOR, payload: fromAction }
export type setRestoreImage = { type: typeof SET_RESTORE_IMAGE, payload: fromActionRestore }
export type storeEditorAction = { type: typeof SET_STORE_EDITOR, payload: storeEditor }