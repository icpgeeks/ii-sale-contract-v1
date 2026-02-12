import {Flex} from 'antd';
import {ExternalLinkToFAQAsQuestionMark} from 'frontend/src/components/widgets/ExternalLinkToFAQAsQuestionMark';
import {PanelHeader} from 'frontend/src/components/widgets/PanelHeader';
import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {i18} from 'frontend/src/i18';
import {useMemo} from 'react';

export const CapturePanelHeader = () => {
    const {identityNumber} = useIdentityHolderContextSafe();
    const message = useMemo(() => i18.holder.state.capture.common.panelTitle(identityNumber), [identityNumber]);
    return (
        <Flex justify="space-between" align="center">
            <PanelHeader title={message} />
            <ExternalLinkToFAQAsQuestionMark fragment="transfer-to" />
        </Flex>
    );
};
