import {i18} from 'frontend/src/i18';
import {Link} from 'react-router-dom';
import {PATH_HOME} from '../../Router';

export const ToolbarHeader = () => {
    return (
        <div className="gf-toolbarHeader">
            <Link to={PATH_HOME}>
                <span className="gf-noWrap">{i18.toolbar.title.first}</span>&nbsp;<span className="gf-noWrap">{i18.toolbar.title.second}</span>
            </Link>
        </div>
    );
};
