import {ExportOutlined} from '@ant-design/icons';
import {ExternalLink} from 'frontend/src/components/widgets/ExternalLink';
import {AbstractCheckbox} from 'frontend/src/components/widgets/form/AbstractCheckbox';
import {i18} from 'frontend/src/i18';
import {useCallback} from 'react';
import {RouterPaths} from '../../../skeleton/Router';
import {useConnectModalDataDataContext} from '../ConnectModalDataProvider';

export const ValidationCheckbox = () => {
    const {formState, updateFormState, formControlsDisabled} = useConnectModalDataDataContext();

    const onClick = useCallback(() => {
        updateFormState({
            validationChecked: !formState.validationChecked
        });
    }, [formState.validationChecked, updateFormState]);

    return (
        <AbstractCheckbox checked={formState.validationChecked == true} onClick={onClick} disabled={formControlsDisabled}>
            <div>
                {i18.auth.connect.confirmationModal.agreementCheckbox.validation.part1}
                <span className="gf-noWrap">
                    <ExternalLink href={RouterPaths.externalFAQPage('validation')} className="gf-underline gf-underline-hover">
                        {i18.auth.connect.confirmationModal.agreementCheckbox.validation.part2}
                    </ExternalLink>{' '}
                    <ExportOutlined className="gf-font-size-smaller" />
                </span>
            </div>
        </AbstractCheckbox>
    );
};
