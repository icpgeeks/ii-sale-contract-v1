import {Flex} from 'antd';
import {AbstractStubPage} from 'frontend/src/components/widgets/stub/AbstractStubPage';
import {i18} from 'frontend/src/i18';
import {RefreshHolderButton} from '../../common/RefreshHolderButton';

export const IdentityHolderWaitingStartCaptureStateGuestPage = () => {
    return (
        <AbstractStubPage
            icon="info"
            title={i18.holder.state.common.contractEmpty}
            prefix={
                <Flex justify="end">
                    <RefreshHolderButton />
                </Flex>
            }
        />
    );
};
