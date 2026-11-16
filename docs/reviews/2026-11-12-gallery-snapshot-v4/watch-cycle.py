from pathlib import Path
import ctypes, ctypes.wintypes as w, hashlib, json, subprocess, time
root=Path.cwd(); out=root/'work/restabschluss/gallery-snapshot-memory'
class Memory(ctypes.Structure):
    _fields_=[('cb',w.DWORD),('PageFaultCount',w.DWORD)]+[(x,ctypes.c_size_t) for x in ['PeakWorkingSetSize','WorkingSetSize','QuotaPeakPagedPoolUsage','QuotaPagedPoolUsage','QuotaPeakNonPagedPoolUsage','QuotaNonPagedPoolUsage','PagefileUsage','PeakPagefileUsage']]
get=ctypes.WinDLL('psapi',use_last_error=True).GetProcessMemoryInfo
get.argtypes=[w.HANDLE,ctypes.POINTER(Memory),w.DWORD]; get.restype=w.BOOL
records=[]
for count,mode,phase in [(100000,'old','cold'),(100000,'old','reopen'),(100000,'new','cold'),(100000,'new','reopen'),(250000,'new','cold'),(250000,'new','reopen')]:
    if True:
        stdout=out/f'cycle-{mode}-{count}-{phase}.json'; stderr=out/f'cycle-{mode}-{count}-{phase}.stderr.txt'; started=time.monotonic(); peak=0; stopped=False
        with stdout.open('wb') as so,stderr.open('wb') as se:
            p=subprocess.Popen(['node','--expose-gc',str(out/'measure-cycle.mjs'),str(root/'work/issue230-integration-candidate'),mode,str(count),phase,str(out/f'cycle-{mode}-{count}.synthetic.sqlite')],stdout=so,stderr=se)
            while p.poll() is None:
                m=Memory(); m.cb=ctypes.sizeof(m)
                if not get(w.HANDLE(int(p._handle)),ctypes.byref(m),m.cb):
                    if p.poll() is None:
                        p.kill(); p.wait(); raise ctypes.WinError(ctypes.get_last_error())
                    break
                peak=max(peak,m.WorkingSetSize)
                if m.WorkingSetSize>1024*1024*1024 or time.monotonic()-started>30:
                    stopped=True; p.kill(); break
                time.sleep(0.02)
            status=p.wait()
        result=json.loads(stdout.read_text()) if status==0 else None
        record={'mode':mode,'phase':phase,'cards':count,'exit':status,'watchdogStopped':stopped,'watchLimitMiB':1024,'observedRssMiB':peak/1024/1024,'elapsedSeconds':time.monotonic()-started,'result':result}
        records.append(record); print(json.dumps(record),flush=True)
(out/'cycle-watched-results.json').write_text(json.dumps(records,indent=2)+'\n')
