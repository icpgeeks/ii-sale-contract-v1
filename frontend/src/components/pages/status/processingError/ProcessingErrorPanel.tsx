import {isNullish} from '@dfinity/utils';
import {Col, Flex, Modal, Row} from 'antd';
import {DisabledAlert} from 'frontend/src/components/widgets/alert/DisabledAlert';
import {DefaultButton} from 'frontend/src/components/widgets/button/DefaultButton';
import {LinkButton} from 'frontend/src/components/widgets/button/LinkButton';
import {CopyButton} from 'frontend/src/components/widgets/form/CopyButton';
import {PanelCard} from 'frontend/src/components/widgets/PanelCard';
import {PanelHeader} from 'frontend/src/components/widgets/PanelHeader';
import {MODAL_WIDTH} from 'frontend/src/constants';
import {useIdentityHolderContext} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {getHolderProcessingError} from 'frontend/src/context/identityHolder/identityHolderUtils';
import {i18} from 'frontend/src/i18';
import {jsonStringify} from 'frontend/src/utils/core/json/json';
import {useCallback, useMemo} from 'react';

export const ProcessingErrorPanel = () => {
    const {holder} = useIdentityHolderContext();
    const [modal, modalContextHolder] = Modal.useModal();

    const errorContent = useMemo(() => getHolderProcessingError(holder?.processing_error), [holder?.processing_error]);

    const onClick = useCallback(() => {
        const errorText = jsonStringify(errorContent, 4);
        modal.confirm({
            open: true,
            title: i18.status.processingError.panelTitle,
            icon: null,
            content: (
                <Flex vertical gap={16}>
                    <DisabledAlert style={{maxHeight: 300, overflow: 'auto'}} message={<div className="gf-preWrap gf-font-size-small">{errorText}</div>} />
                    <Row className="gf-width-100" wrap={false}>
                        <Col flex="auto">
                            <DefaultButton onClick={() => Modal.destroyAll()} className="gf-width-100">
                                {i18.common.button.closeButton}
                            </DefaultButton>
                        </Col>
                        <Col style={{marginLeft: 8}}>
                            <CopyButton text={errorText} className="gf-height-100" />
                        </Col>
                    </Row>
                </Flex>
            ),
            footer: null,
            autoFocusButton: null,
            width: MODAL_WIDTH,
            closable: false,
            maskClosable: false,
            keyboard: false
        });
    }, [errorContent, modal]);

    if (isNullish(errorContent)) {
        return null;
    }

    return (
        <PanelCard>
            {modalContextHolder}
            <Flex vertical gap={16}>
                <PanelHeader title={i18.status.processingError.panelTitle} danger />
                <div>
                    <div>{i18.status.processingError.panelDescription}</div>
                    <LinkButton size="small" className="gf-underline gf-no-padding" onClick={onClick}>
                        {i18.status.processingError.viewLink}
                    </LinkButton>
                </div>
            </Flex>
        </PanelCard>
    );
};
