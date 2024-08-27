### Starting Firecracker
sudo firecracker-containerd --config /etc/firecracker-containerd/config.toml

### Testing Firecracker
sudo firecracker-ctr --address /run/firecracker-containerd/containerd.sock \
     image pull \
     --snapshotter devmapper \
     docker.io/library/debian:latest
sudo firecracker-ctr --address /run/firecracker-containerd/containerd.sock \
     run \
     --snapshotter devmapper \
     --runtime aws.firecracker \
     --rm --tty --net-host \
     docker.io/library/debian:latest \
     test # Container ID

### Serverless TS
# Before running the following commands, make sure to copy the serverless-ts directory to the instance via copy.sh
docker build -t serverless-ts-a:latest .
docker build -t serverless-ts-b:latest .

docker save -o serverless-ts-a.tar serverless-ts-a:latest
docker save -o serverless-ts-b.tar serverless-ts-b:latest


sudo firecracker-ctr --address /run/firecracker-containerd/containerd.sock \
	 image import \
	 --snapshotter devmapper \
	 serverless-ts-a.tar

sudo firecracker-ctr --address /run/firecracker-containerd/containerd.sock \
	 image import \
	 --snapshotter devmapper \
	 serverless-ts-b.tar

# --cpus 1
# --cpu-shares 512 \ # Reduce CPU shares to prevent the request queue from being starved
sudo firecracker-ctr --address /run/firecracker-containerd/containerd.sock \
	 run \
	 --snapshotter devmapper \
	 --runtime aws.firecracker \
	 --rm --net-host \
	 --cpus 1 \
	 --memory-limit 512000000 \
	 docker.io/library/serverless-ts-a:latest \
	 test

# Or detached:
sudo firecracker-ctr --address /run/firecracker-containerd/containerd.sock \
	 run \
	 --snapshotter devmapper \
	 --runtime aws.firecracker \
	 --net-host \
	 --cpus 1\
	 --memory-limit 1024000000 \
	 --detach \
	 docker.io/library/serverless-ts-a:latest \
	 test1

sudo firecracker-ctr --address /run/firecracker-containerd/containerd.sock \
	 run \
	 --snapshotter devmapper \
	 --runtime aws.firecracker \
	 --cpus 1\
	 --memory-limit 2048000000 \
	 --detach \
	 docker.io/library/serverless-ts-a:latest \
	 test2

sudo firecracker-ctr --address /run/firecracker-containerd/containerd.sock \
	 run \
	 --snapshotter devmapper \
	 --runtime aws.firecracker \
	 --net-host \
	 --cpus 0.5 \
	 --memory-limit 512000000 \
	 --detach \
	 docker.io/library/serverless-ts-b:latest \
	 test2

# List all images
sudo firecracker-ctr --address /run/firecracker-containerd/containerd.sock image list

# List all containers
sudo firecracker-ctr --address /run/firecracker-containerd/containerd.sock container list

sudo firecracker-ctr --address /run/firecracker-containerd/containerd.sock container info <container-id>

sudo firecracker-ctr --address /run/firecracker-containerd/containerd.sock container rm test1


### Network
# IP addresses can be found in /var/lib/cni/networks/fcnet

# To see the network traffic on the bridge
sudo tcpdump -i fc-br0

# Or when writing to a file
sudo tcpdump -i fc-br0 -w network_traffic.pcap

sudo apt-get install tshark

# TODO: EBPF (Extended Berkeley Packet Filter) for more detailed network analysis

# Now the packets can be analyzed using tshark
tshark -r network_traffic.pcap

# Or
tshark -r network_traffic.pcap -T fields -e frame.time_epoch -e ip.src -e ip.dst -e tcp.srcport -e tcp.dstport -e http.request.method -e http.response.code -E separator=,

### Request Queue
docker build -t request-queue:latest .
docker run -d -p 80:80 -e LAMBDA1_ADDRESS=http://192.168.1.2:8080/2015-03-31/functions/function/invocations -e LAMBDA2_ADDRESS=http://192.168.1.3:8080/2015-03-31/functions/function/invocations --name request-queue request-queue:latest

### Request local lambda 
curl "http://192.168.1.2:8080/2015-03-31/functions/function/invocations" -d '{"payload":"hello world!"}'