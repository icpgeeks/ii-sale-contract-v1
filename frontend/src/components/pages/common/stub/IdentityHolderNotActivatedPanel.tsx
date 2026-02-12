import {Flex} from 'antd';
import {AbstractStubPage} from 'frontend/src/components/widgets/stub/AbstractStubPage';
import {i18} from 'frontend/src/i18';
import {RefreshHolderButton} from '../../identity/state/activated/common/RefreshHolderButton';

export const IdentityHolderNotActivatedPanel = () => {
    return (
        <AbstractStubPage
            icon="info"
            title={i18.holder.state.common.notActivated}
            prefix={
                <Flex justify="end">
                    <RefreshHolderButton />
                </Flex>
            }
        />
    );
};
