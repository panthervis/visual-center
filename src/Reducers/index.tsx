import { DrawPos } from '../pages/types';
import * as actionType from '../Actions/types'
import { combineReducers } from 'redux'
export interface editorState {
    editor: {
        editor: {
            orignalImage: string,
            removedImage: string,
            idx: number
        }
        modified: string,
        restoredImage: string,
        storeEditor: {
            drawnPos: DrawPos[] | [],
            mode: number,
            color:string,
            image:any,
            blur:number
        }

    }

}
const initialEditor = {
    editor: {
        orignalImage: '',
        removedImage: '',
        idx: -1
    },
    modified: '',
    restoredImage: '',
    storeEditor: {
        drawnPos: [],
        mode: 0,
        color: '',
        blur:0
    }
}
const editorReducer = (state = initialEditor, action: actionType.storeEditorAction | actionType.sendToEditorAction | actionType.sendFromEditorAction | actionType.setRestoreImage) => {
    switch (action.type) {
        case actionType.SEND_TO_EDITOR:
            return {
                ...state,
                editor: action.payload
            }
        case actionType.SEND_FROM_EDITOR:
            return {
                ...state,
                modified: action.payload
            }
        case actionType.SET_RESTORE_IMAGE:
            return {
                ...state,
                restoredImage: action.payload.restoredImage
            }
        case actionType.SET_STORE_EDITOR:
            return {
                ...state,
                storeEditor: action.payload
            }
        default:
            return state
    }

}
const rootReducer = combineReducers({
    editor: editorReducer,
})
export default rootReducer