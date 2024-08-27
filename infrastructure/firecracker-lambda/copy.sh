clientInstanceName="empiris-duet-instance"
zone="europe-west3-c"

sut_ip="$(gcloud compute instances describe $clientInstanceName --zone=$zone --format='get(networkInterfaces[0].accessConfigs[0].natIP)')"
echo "SUT IP is" $sut_ip

# Copy Request queue to emulator
echo "Copying request queue to emulator.."
gcloud compute scp --recurse $PWD/../../request-queue $clientInstanceName:~/ --zone $zone >> /dev/null

example_dir=$PWD/../../examples/sieve-of-eratosthenes

# Copy lambda to emulator
echo "Copying lambda to emulator.."
# Create a new directory on the emulator instance
gcloud compute ssh $clientInstanceName --zone $zone -- "mkdir -p serverless-ts"
gcloud compute scp --recurse $example_dir $clientInstanceName:~/serverless-ts --zone $zone >> /dev/null

# Copy deps.sh
echo "Copying deps.sh to emulator.."
gcloud compute scp $PWD/deps.sh $clientInstanceName:~/ --zone $zone >> /dev/null

# Copy firecracker-containerd.sh
echo "Copying firecracker-containerd.sh to emulator.."
gcloud compute scp $PWD/firecracker-containerd.sh $clientInstanceName:~/ --zone $zone >> /dev/null
