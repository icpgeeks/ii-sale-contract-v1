import {WarningAlert} from 'frontend/src/components/widgets/alert/WarningAlert';
import {i18} from 'frontend/src/i18';

export const Description = () => {
    return (
        <>
            <div>{i18.settings.danger.addController.modal.description}</div>
            <WarningAlert
                message={
                    <div>
                        <b>{i18.settings.danger.addController.modal.warning.part1}</b> {i18.settings.danger.addController.modal.warning.part2}
                    </div>
                }
            />
        </>
    );
};
