#!/bin/sh
# spec check: python3-free; usage: sh tools/check.sh video.mp4
f="$1"
ffprobe -v error -show_entries format=duration,size,bit_rate -show_entries stream=codec_name,profile,width,height,r_frame_rate,nb_frames,sample_rate,channels,bit_rate -of default=nw=1 "$f"
echo "--- loudness (EBU R128, true peak)"
ffmpeg -hide_banner -nostats -i "$f" -map 0:a -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:|LRA:" | tail -3
echo "--- black frames"
ffmpeg -hide_banner -nostats -i "$f" -vf blackdetect=d=0.03:pix_th=0.06 -an -f null - 2>&1 | grep -c black_start
echo "--- silence (should be the 9.80-10.00 gap only)"
ffmpeg -hide_banner -nostats -i "$f" -af silencedetect=n=-50dB:d=0.1 -vn -f null - 2>&1 | grep -E "silence_(start|end)"
