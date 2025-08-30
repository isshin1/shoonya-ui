import { Toaster, ToastBar, toast } from 'react-hot-toast';

export function CustomToaster() {
    return (
        <Toaster position="bottom-center" >
            {(t) => (
                <ToastBar toast={t} >
                    {({ icon, message }) => (
                        <div
                            onClick={() => toast.dismiss(t.id)}
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center',  }}
                        >
                            {icon}
                            <div style={{ flex: 1 }}>{message}</div>
                        </div>
                    )}
                </ToastBar>
            )}
        </Toaster>
    );
}
