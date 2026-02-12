import {ExportOutlined} from '@ant-design/icons';
import {ExternalLink} from 'frontend/src/components/widgets/ExternalLink';
import {AbstractCheckbox} from 'frontend/src/components/widgets/form/AbstractCheckbox';
import {i18} from 'frontend/src/i18';
import {useCallback} from 'react';
import {RouterPaths} from '../../../skeleton/Router';
import {useConnectModalDataDataContext} from '../ConnectModalDataProvider';

export const RisksCheckbox = () => {
    const {formState, updateFormState, formControlsDisabled} = useConnectModalDataDataContext();

    const onClick = useCallback(() => {
        updateFormState({
            risksChecked: !formState.risksChecked
        });
    }, [formState.risksChecked, updateFormState]);

    return (
        <AbstractCheckbox checked={formState.risksChecked == true} onClick={onClick} disabled={formControlsDisabled}>
            {i18.auth.connect.confirmationModal.agreementCheckbox.risks.part1}
            <span className="gf-noWrap">
                <ExternalLink href={RouterPaths.externalFAQPage('risks')} className="gf-underline gf-underline-hover">
                    {i18.auth.connect.confirmationModal.agreementCheckbox.risks.part2}
                </ExternalLink>{' '}
                <ExportOutlined className="gf-font-size-smaller" />
            </span>
        </AbstractCheckbox>
    );
};
