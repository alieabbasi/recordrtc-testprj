/* eslint-disable react-hooks/exhaustive-deps */
import { FC } from "react";
import { useEffect, useRef, useState } from "react";
import RecordRTC, { MediaStreamRecorder, MultiStreamRecorder } from "recordrtc";
import { Icon, IconifyIcon } from "@iconify/react";
import record12Regular from "@iconify/icons-fluent/record-12-regular";
import arrowCounterclockwise12Regular from "@iconify/icons-fluent/arrow-counterclockwise-12-regular";
import stop16Filled from "@iconify/icons-fluent/stop-16-filled";
import play12Filled from "@iconify/icons-fluent/play-12-filled";
import pause12Filled from "@iconify/icons-fluent/pause-12-filled";
import cameraSwitch20Filled from "@iconify/icons-fluent/camera-switch-20-filled";

enum States {
  IDLE,
  RECORDING,
  PAUSED,
  RECORDED,
}

interface RecorderProps {}

const Recorder: FC<RecorderProps> = () => {
  const [state, setState] = useState<States>(States.IDLE);
  const [recorder, setRecorder] = useState<MultiStreamRecorder | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [currentCam, setCurrentCam] = useState<"user" | "environment">("user");
  const [sizes, setSizes] = useState<{ width: number | undefined; height: number | undefined }>();

  const videoElRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoElRef.current) {
      startDevice();
    }
  }, [videoElRef]);

  let mainButtonIcon: IconifyIcon;
  switch (state) {
    case States.IDLE:
      mainButtonIcon = record12Regular;
      break;
    case States.PAUSED:
      mainButtonIcon = stop16Filled;
      break;
    case States.RECORDED:
      mainButtonIcon = arrowCounterclockwise12Regular;
      break;
    case States.RECORDING:
      mainButtonIcon = stop16Filled;
      break;
  }

  const secondButtonIcon = state === States.PAUSED ? play12Filled : pause12Filled;

  const startDevice = async () => {
    await getUserMedia(currentCam);
    getDevices();
  };

  const getMaxSizes = async (facingMode: "user" | "environment") => {
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode } });
    } catch (err) {
      alert("Failed To Capture Stream in [getMaxSizes()] (( FacingMode: " + facingMode + " ))");
      return;
    }
    let width: number | undefined = undefined,
      height: number | undefined = undefined;
    try {
      stream.getTracks().forEach((track) => {
        width = track.getCapabilities().width?.max || undefined;
        height = track.getCapabilities().height?.max || undefined;
        alert("track's width:" + width + "\n track's height:" + height);
        
        if (!width || !height) return;

        if (width < (height * 9) / 16) {
          if (width > 720) {
            width = 720;
          }
          height = (width * 16) / 9;
        } else {
          if (height > 1280) {
            height = 1280;
          }
          width = (height * 9) / 16;
        }
        track.stop();
      });
    } catch (err) {
      return;
    }
    return { width, height };
  };

  const getDevices = async () => {
    const mediaDevices = (await navigator.mediaDevices.enumerateDevices()).filter(
      (device) => device.kind === "videoinput"
    );

    mediaDevices.forEach((device) => {
      navigator.mediaDevices
        .getUserMedia({
          audio: false,
          video: {
            deviceId: { exact: device.deviceId },
          },
        })
        .then((stream) => {
          console.log("Found Video Input:", stream.id);
          stream.getTracks().forEach((track) => {
            console.log("Capabilities:", track.getCapabilities());
            console.log("Settings:", track.getSettings());
            track.stop();
          });
        });
    });

    console.log("Video Devices:", mediaDevices);
    return mediaDevices;
  };

  const getUserMedia = async (facingMode: "user" | "environment") => {
    try {
      const sizes = await getMaxSizes(facingMode);
      alert("Sizes:  " + JSON.stringify(sizes));
      setSizes(sizes);
      if (!audioStream) {
        const newAudioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        setAudioStream(newAudioStream);
      }

      const isInverted = mobileAndTabletCheck();

      const newVideoStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode, width: isInverted ? sizes?.height : sizes?.width, height: isInverted ? sizes?.width : sizes?.height },
      });
      if (videoElRef.current) {
        videoElRef.current.srcObject = newVideoStream;
        setVideoStream(newVideoStream);
        newVideoStream.getTracks().forEach(track => {
          alert(`Track Dimensions: width = ${track.getSettings().width} & height = ${track.getSettings().height}`);
        })

        if (recorder) {
          recorder.resetVideoStreams([newVideoStream, audioStream!]);
        }
      }
    } catch (err) {
      alert("Unable to capture your camera. Please check console logs.");
      console.error(err);
    }
  };

  const changeDevice = () => {
    if (!videoStream) {
      console.log("No Stream!!!");
      return;
    }
    videoStream.getTracks().forEach((track) => {
      track.stop();
    });
    if (currentCam === "user") {
      getUserMedia("environment");
      setCurrentCam("environment");
    } else {
      getUserMedia("user");
      setCurrentCam("user");
    }
  };

  const actionButtonHandler = () => {
    switch (state) {
      case States.IDLE:
        startRecording();
        break;
      case States.PAUSED:
        stopRecording();
        break;
      case States.RECORDING:
        stopRecording();
        break;
      case States.RECORDED:
        recordAgain();
        break;
    }
  };

  const startRecording = () => {
    if (audioStream && videoStream) {
      const recorder = new MultiStreamRecorder([audioStream, videoStream], { type: "video", recorderType: MultiStreamRecorder });
      console.log("RECORDER:", recorder);
      recorder.record();
      setRecorder(recorder);
      setState(States.RECORDING);
    }
  };

  const resumeRecording = () => {
    recorder?.resume();
    setState(States.RECORDING);
  };

  const pauseRecording = () => {
    recorder?.pause();
    setState(States.PAUSED);
  };

  const stopRecording = async () => {
    if (videoElRef.current) {
      recorder?.stop((blob) => {
        videoElRef.current!.srcObject = null;
        videoElRef.current!.src = window.URL.createObjectURL(blob);
        recorder?.clearRecordedData();
        setRecorder(null);
        setState(States.RECORDED);
      });
    }
  };

  const recordAgain = () => {
    videoElRef.current!.srcObject = videoStream;
    setState(States.IDLE);
  };

  return (
    <div className="w-screen h-screen flex justify-center items-center">
      <div className="h-full max-h-full w-full max-w-full bg-slate-600 relative flex justify-center items-center">
        <div className="w-max object-cover relative">
          {state !== States.RECORDED && (
            <div className="flex absolute top-10 right-10 justify-center items-center">
              <button className="z-10 bg-black/50 text-white p-2 rounded-full" onClick={changeDevice}>
                <Icon icon={cameraSwitch20Filled} className="text-6xl" />
              </button>
            </div>
          )}
          <div className="flex absolute bottom-20 justify-center items-center w-full space-x-4">
            <button className="z-10 bg-black/50 text-white p-2 rounded-full" onClick={actionButtonHandler}>
              <Icon icon={mainButtonIcon} className="text-6xl text-red-400" />
            </button>
            {(state === States.RECORDING || state === States.PAUSED) && (
              <button
                className="z-10 bg-black/50 text-white p-2 rounded-full"
                onClick={() => (state === States.PAUSED ? resumeRecording() : pauseRecording())}
              >
                <Icon icon={secondButtonIcon} className="text-6xl" />
              </button>
            )}
          </div>
          <video
            className="w-full h-full object-cover"
            id="the-video"
            autoPlay
            playsInline
            controls={state === States.RECORDED ? true : false}
            muted={state === States.RECORDED ? false : true}
            ref={videoElRef}
          ></video>
          {sizes && <div className="z-10 absolute top-0 left-0 bg-white">{JSON.stringify(sizes)}</div>}
        </div>
      </div>
    </div>
  );
};

export default Recorder;

const mobileAndTabletCheck = function() {
  let check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor);
  return check;
};