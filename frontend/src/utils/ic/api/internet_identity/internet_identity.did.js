export const idlFactory = ({IDL}) => {
    const IdentityNumber = IDL.Nat64;
    const RegistrationId = IDL.Text;
    return IDL.Service({
        lookup_by_registration_mode_id: IDL.Func([RegistrationId], [IDL.Opt(IdentityNumber)], [])
    });
};
