import production from './prod.config'
import development from './dev.config'
import local from './local.config'

const configs = { production, development, local };
const env = process.env.REACT_APP_ENVIRONMENT;

export default configs[env];
